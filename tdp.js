/*
TDP - Tiny Dialogue Plugin
Alexej Sidorenko, 2k16
https://github.com/fra-iesus/tdp
*/

(function($) {
	var TdpPlugin = function($el, options, parameters) {
		var self = this;
		// defaults
		this._defaults = {
			animationSpeed: 'slow',
			animationFastSpeed: 'fast',
			errorMessageEmptyInput: 'Field is mandatory',
			scrollToErrorDuration: 2000,
			scrollToErrorEnabled: true,
			dialogShowDuration: 500,
			dialogCloseDuration: 500,
			dialogAutoclose: false,
			validationOkElement: 'span.tdp-vld-ok',
			validationOkText: '✓',
			prevalidation: true,
			notEmptyAsValidated: true,
			validationOkShow: function(el) {
				return el.fadeIn(self.options('animationSpeed'));
			},
			validationOkHide: function(el) {
				return el.fadeOut(self.options('animationFastSpeed'));
			},
			validationWorkingElement: 'span.tdp-vld-working',
			validationWorkingShow: function(el) {
				return el.fadeIn(self.options('animationSpeed'));
			},
			validationWorkingHide: function(el) {
				return el.fadeOut(self.options('animationFastSpeed'));
			},
			validationMessageElement: 'span.tdp-vld-msg',
			validationMessageSeparator: '<br />',
			validationMessageProcessor: function(message) {
				return message.join(self.options('validationMessageSeparator'));
			},
			validationMessageFlashDelay: 300,
			validationMessageFlash: function(el) {
				return el.fadeIn(self.options('animationSpeed')).fadeOut(self.options('animationSpeed')).fadeIn(self.options('animationSpeed')).fadeOut(self.options('animationSpeed')).fadeIn(self.options('animationSpeed'));
			},
			validationMessageShow: function(el) {
				return el.fadeIn(self.options('animationSpeed'));
			},
			validationMessageHide: function(el) {
				return el.fadeOut(self.options('animationFastSpeed'));
			},
			validatorRequestProcessor: function(value, params) {
				return { data: value, params: params };
			},
			validatorResponseProcessor: function(data) {
				if (data) {
					return data.response;
				}
				return false;
			},
			submitMethod: null, // use built-in submit method
			submitTimeout: 5000,
			submitUrl: null,
			submitLoadingElement: null,
			beforeSubmit: null,
			submitElement: 'input[type="submit"]',
			submitHandlers: {
				success: function(data) {
				},
				error: function(data) {
				},
				always: function() {
					if (self.options('submitLoadingElement')) {
						$(self.options('submitLoadingElement')).hide();
					}
				}
			},
			skipOnInput: ['validator', 'min', 'not', 'match'],
			verbose: false,
			logger: null
		};

		if (!parameters || typeof(parameters) !== 'object') {
			if (options && typeof(options) === 'object') {
				parameters = options;
				options = {};
			} else {
				return console.warn('$.TdpPlugin constructor called without mandatory parameters');
			}
		}
		if (!options || typeof(options) !== 'object') {
			options = {};
		}

		this._options = $.extend( true, {}, this._defaults, options );
		this._parameters = $.extend( true, {}, parameters);
		this._parameters.element = $el;
		this.validators_to_go = 0;
		this.after_validators = null;

		// options - getter/setter
		this.options = function(options) {
			if (options) {
				if (typeof(options) === 'string') {
					return this._options[options];
				}
				return $.extend(true, this._options, options);
			}
			return this._options;
		};

		if (this.options('logger') && $(this.options('logger')).length) {
			this._log = $(this.options('logger'));
		} else {
			this._log = null;
		}

		// show dialogue
		this.show = function() {
			$(this._parameters.element).show(this.options('dialogShowDuration'));
			return this;
		};
		// hide dialogue
		this.hide = function() {
			$(this._parameters.element).hide(this.options('dialogCloseDuration'));
			return this;
		};

		function outerElement(el) {
			return el.split(' ')[0];
		}

		function getByOuterElement(el, name) {
			var els = el.split(' ');
			els[0] += '[name="' + name + '"]';
			return els.join(' ');
		}

		function firstElement(element, pos) {
			var element_position;
			if (element.is(':visible')) {
				element_position = element.offset().top;
			} else {
				element_position = element.parent().offset().top;
			}
			return (pos === null) ? element_position : Math.min(pos, element_position);
		}

		//get input element
		this.getInput = function (name) {
			if (!this._parameters.values[name]) {
				console.warn('Unknown input "' + name + '"');
				return '';
			}
			var filter = this._parameters.values[name].type === 'radio' ? ':checked' : '';
			var element = $(this._parameters.element).find('input[name="' + name + '"]' + filter + ',textarea[name="' + name + '"],select[name="' + name + '"]').first();
			if (element.length) {
				return element;
			} else if (filter !== '') {
				element = $(this._parameters.element).find('input[name="' + name + '"],textarea[name="' + name + '"],select[name="' + name + '"]').first();
				if (element.length) {
					return element;
				}
			}
			console.warn('Element for input "' + name + '" does not exist');
			return '';
		};

		//get value from input name
		this.getValue = function (name) {
			var element = this.getInput(name);
			if (element) {
				if (element.attr('type') === 'radio') {
					if (!element.prop("checked")) {
						return '';
					}
				}
				return element.val();
			}
			return '';
		};

		//set value to input by input name
		this.setValue = function (name, value) {
			if (this._parameters.values[name].type === 'radio') {
				if (value) {
					$(this._parameters.element).find('input:radio[name="' + name + '"]').filter('[value="' + value + '"]').first().prop( "checked", true );
				} else {
					return $(this._parameters.element).find('input:radio[name="' + name + '"]').first().prop( "checked", false );
				}
			}
			var input = this.getInput(name);
			if (!input.length) {
				console.warn('Element for input "' + name + '" does not exist');
				return false;
			}
			if (this._parameters.values[name].type === 'select') {
				input.selectedIndex = -1;
			}
			return this.getInput(name).val(value);
		};

		this.showValidationMsg = function (name, msg) {
			var validation_msg_el = $(this._parameters.element).find(outerElement(this.options('validationMessageElement')) + '[name="' + name + '"]').first();
			if (validation_msg_el) {
				if (msg) {
					var validation_msg = $(this._parameters.element).find(getByOuterElement(this.options('validationMessageElement'), name)).first();
					validation_msg.html(msg);
				}
				this.options('validationMessageShow')(validation_msg_el);
			}
		};
		this.hideValidationMsg = function (name) {
			var validation_msg_el = $(this._parameters.element).find(outerElement(this.options('validationMessageElement')) + '[name="' + name + '"]').first();
			if (validation_msg_el) {
				this.options('validationMessageHide')(validation_msg_el);
				var validation_msg = $(this._parameters.element).find(getByOuterElement(this.options('validationMessageElement'), name)).first();
				validation_msg.html('');
			}
		};

		this.showValidationOk = function (name) {
			var validation_ok = $(this._parameters.element).find(outerElement(this.options('validationOkElement')) + '[name="' + name + '"]').first();
			if (validation_ok) {
				this.options('validationOkShow')(validation_ok);
			}
		};
		this.hideValidationOk = function (name) {
			var validation_ok = $(this._parameters.element).find(outerElement(this.options('validationOkElement')) + '[name="' + name + '"]').first();
			if (validation_ok) {
				this.options('validationOkHide')(validation_ok);
			}
		};

		this.showValidationWorking = function (name) {
			var validation_working = $(this._parameters.element).find(getByOuterElement(this.options('validationWorkingElement'), name)).first();
			if (validation_working) {
				this.options('validationWorkingShow')(validation_working);
			}
		};
		this.hideValidationWorking = function (name) {
			var validation_working = $(this._parameters.element).find(getByOuterElement(this.options('validationWorkingElement'), name)).first();
			if (validation_working) {
				this.options('validationWorkingHide')(validation_working);
			}
		};

		this.reset = function () {
			var self = this;
			Object.keys(this._parameters.values).forEach(function(key) {
				var input = self._parameters.values[key];
				if (input.type !== 'hidden') {
					input.validated = null;
					input.old_value = null;
					self.setValue(key, input.value);
					self.hideValidationMsg(key);
					self.hideValidationOk(key);
					if (input.value && self.options('prevalidation')) {
						self.validate(key);
					}
				}
			});
		};

		// validate input
		this.validate = function( input, skip_validators ) {
			if (typeof input === 'string') {
				if (this._parameters.values[input].type === 'hidden') {
					this._parameters.values[input].validated = true;
					return true;
				}
			}
			var $input = (input instanceof jQuery ? input : (typeof input === 'string' ? this.getInput(input) : $(input)));
			if ( $input.is('input,textarea,select') ) {
				var self = this;
				var name = $input.attr('name');
				if ( name in self._parameters.values ) {
					var value = self.getValue(name);
					var definition = self._parameters.values[name];
					if (definition.old_value !== null && value === definition.old_value) {
						if (definition.match) {
							if (self.getValue(definition.match) == value) {
								return;
							}
						} else {
							if (!definition.revalidate) {
								return;
							}
						}
					}
					if (!skip_validators) {
						definition.old_value = value;
					} else {
						definition.old_value = null;
					}
					var results = [];
					var later = false;
					var skipped = false;
					if (skip_validators) {
						skipped = true;
					}
					if ( Number.isNaN(value) || (value === undefined) || (value == null) || (value.trim() === '')) {
						self.hideValidationOk(name);
						if (definition.empty) {
							self.hideValidationMsg(name);
							definition.validated = true;
							return true;
						} else {
							self.showValidationMsg(name, self.options('errorMessageEmptyInput'));
							definition.validated = false;
							return false;
						}
					}
					if (!definition.conditions || !definition.conditions.length) {
						definition.validated = true;
						self.hideValidationMsg(name);
						if (self.options('notEmptyAsValidated')) {
							self.showValidationOk(name);
						}
						return true;
					}
					definition.conditions.some(function(entry) {
						if (skip_validators && $.inArray(entry.type, skip_validators) > -1) {
							return false;
						}
						var result = true;
						var t1, t2;
						switch (definition.type) {
							case 'tel':
							case 'email':
							case 'password':
							case 'text':
								t1 = value.length;
								t2 = entry.value;
								break;
							case 'date':
								t1 = new Date(value);
								t2 = new Date(entry.value);
								break;
							case 'integer':
								t1 = parseInt(value, 10);
								t2 = entry.value;
								break;
							case 'float':
								t1 = parseFloat(value, 10);
								t2 = entry.value;
								break;
							case 'checkbox':
							case 'radio':
							case 'select':
								t1 = value;
								t2 = entry.value;
								break;
							case 'hidden':
								break;
							default:
								console.warn('Input "' + name + '" has unknown input type "' + definition.type + '"');
						}
						if (self._log !== null) {
							self._log.append("Evaluating condition '" + entry.type + "(" + t1 + ", " + t2 + ")'\n");
						}
						switch (entry.type) {
							case 'regular':
								var patt = new RegExp(entry.value);
								result = patt.test(value);
								break;
							case 'not':
								result = (t1 !== t2);
								break;
							case 'notNaN':
								result = !Number.isNaN(t1) && (t1 !== undefined);
								break;
							case 'valid':
								result = t1 == value;
								break;
							case 'min':
								result = !Number.isNaN(t1) && (t1 !== undefined) && t1 >= t2;
								break;
							case 'max':
								result = !Number.isNaN(t1) && (t1 !== undefined) && t1 <= t2;
								break;
							case 'match':
								result = value == self.getValue(entry.value);
								break;
							case 'date':
							case 'age':
								var date;
								var skip = false;
								if ($.isArray(entry.value)) {
									if (!self.getValue(entry.value[0]) || !self.getValue(entry.value[1]) || !self.getValue(entry.value[2])) {
										skip = true;
									} else {
										date = new Date(self.getValue(entry.value[0]), self.getValue(entry.value[1])-1, self.getValue(entry.value[2]));
									}
								} else {
									date = new Date(value);
								}
								if (!skip) {
									if (Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date.getTime())) {
										// todo: add compatison for strings
										if (entry.type === 'age') {
											var age = +date;
											result = ~~((Date.now() - age - 86400000) / (31557600000)) >= entry.value[3];
										} else {
											if (date.getFullYear() == self.getValue(entry.value[0]) &&
												date.getMonth() == self.getValue(entry.value[1])-1 &&
												date.getDate() == self.getValue(entry.value[2])) {
												result = true;
												if ($.isArray(entry.value)) {
													var tmp_validated = definition.validated;
													definition.validated = 1;
													entry.value.some(function(date_part) {
														if (name != date_part && !self._parameters.values[date_part].validated) {
															self.validate(date_part, skip_validators);
														}
													});
													definition.validated = tmp_validated;
												}
											} else {
												result = false;
											}
										}
									} else {
										result = false;
									}
								} else {
									skipped = true;
									result = true;
								}
								break;
							case 'validator':
								if (value == definition.value && definition.prevalidated) {
									result = true;
								} else {
									self.hideValidationMsg(name);
									self.hideValidationOk(name);
									self.showValidationWorking(name);
									later = true;
									definition.validated = false;
									self.validators_to_go++;
									var request = $.ajax({
										url: entry.value,
										type: 'POST',
										data: JSON.stringify( self.options('validatorRequestProcessor')(value, entry.params) ),
										dataType: 'json',
										timeout: self.options('submitTimeout'),
										cache: false,
										success: function(data) {
											var message = self.options('validatorResponseProcessor')(data);
											var result = false;
											if (typeof message === 'string') {
												result = self.options('validationMessageProcessor')([message]);
											} else {
												result = message ? entry.message : false;
											}
											if (!result) {
												definition.validated = true;
												self.showValidationOk(name);
												if (self.validators_to_go > 0) {
													self.validators_to_go--;
													if (self.validators_to_go === 0 && self.after_validators !== null) {
														self.after_validators();
													}
												}
											} else {
												definition.validated = false;
												if (self.validators_to_go > 0) {
													self.validators_to_go--;
													self.first_unvalidated = firstElement($input, self.first_unvalidated);
												}
												if (!self.validators_to_go) {
													if (self.options('scrollToErrorEnabled')) {
														$('html, body').animate({
															scrollTop: self.first_unvalidated
														}, self.options('scrollToErrorDuration'));
													}
												}
												self.after_validators = null;
												self.showValidationMsg(name, result);
											}
										},
										error: function(data) {
												definition.validated = false;
												if (self.validators_to_go > 0) {
													self.validators_to_go--;
													self.first_unvalidated = firstElement($input, self.first_unvalidated);
												}
												if (!self.validators_to_go) {
													if (self.options('scrollToErrorEnabled')) {
														$('html, body').animate({
															scrollTop: self.first_unvalidated
														}, self.options('scrollToErrorDuration'));
													}
												}
												self.after_validators = null;
												result = self.options('validationMessageProcessor')([entry.message]);
												self.showValidationMsg(name, result);
										},
										async: true
									}).always(function () {
										self.hideValidationWorking(name);
									});
								}
								break;
							default:
								console.warn('Unknown condition type "' + entry.type + '"');
						}
						if (!result) {
							results.push(entry.message);
							if (entry.last) {
								return true;
							}
						}
						return false;
					});
					if (!skipped && !later) {
						definition.validated = (results.length === 0);
					}
					var result = self.options('validationMessageProcessor')(results);
					if (!result) {
						self.hideValidationMsg(name);
						if (!skipped && !later && !(definition.match && !self._parameters.values[definition.match].validated)) {
							self.showValidationOk(name);
						} else {
							self.hideValidationOk(name);
						}
					} else {
						self.showValidationMsg(name, result);
						self.hideValidationOk(name);
					}
					return (!result);
				} else {
					console.warn('Input "' + name + '" is not defined for validation');
				}
			} else {
				console.warn('Element "' + input + '" is not valid input');
			}
		};

		//html element creator
		function createElement(el, html) {
			function createSubElement(el, html) {
				var start_class = el.indexOf('.');
				var start_id = el.indexOf('#');
				var prop = '';
				if (start_class > 0 || start_id > 0) {
					var start_prop;
					if (start_class > 0 && start_id > 0) {
						start_prop = Math.min(start_class, start_id);
					} else if (start_class > 0) {
						start_prop = start_class;
					} else {
						start_prop = start_id;
					}
					prop = el.substring(start_prop);
					el = el.substring(0, start_prop);
				}
				var props = prop.split('.'),
				newelement = $('<' + el + '></' + el + '>'),
				id = '',
				className = '';
				$.each(props, function(i, val) {
					if(val.indexOf('#') >= 0) {
						id += val.replace(/^#/, '');
					} else {
						className += val + ' ';
					}
				});
				if (id.length) {
					newelement.attr('id', id);
				}
				if(className.length) {
					newelement.attr('class', className.trim());
				}
				return $(newelement).html(html);
			}
			var els = el.split(' ');
			els = els.reverse();
			var inner = html;
			$.each(els, function(i, val) {
				inner = createSubElement(val, inner).prop('outerHTML');
			});
			return $(inner);
		}

		// validator
		Object.keys(this._parameters.values).forEach(function(key) {
			var input = self._parameters.values[key];
			if (!input.validated) {
				input.validated = null;
			}
			input.old_value = null;
			var match = false;
			var revalidate = false;
			if (input.conditions && input.conditions.length) {
				input.conditions.some(function(entry) {
					if (entry.type === 'match') {
						match = entry.value;
						revalidate = true;
						return;
					} else if (entry.type === 'date') {
						revalidate = true;
						return;
					}
				});
			}
			input.match = match;
			input.revalidate = revalidate;
			if (input.type !== 'hidden') {
				input_element = $el.find('input[name="' + key + '"],textarea[name="' + key + '"],select[name="' + key + '"]');
				if (input.type === 'select') {
					if (input.interval || input.values) {
						// for select set allowed values if defined
						if (input.values) {
							input.values.some(function(entry) {
								var setting = [];
								if( typeof entry === 'string' ) {
									setting = [entry, entry, false];
								} else {
									setting = [ entry[0], (entry.length > 1 ? entry[1] : entry[0]), (entry.length > 2 ? !entry[2] : false)];
								}
								var option = createElement('option', entry[1]).attr("value",entry[0]);
								if (entry[2]) {
									option.attr("disabled");
								}
								if (input.value == setting[1]) {
									input_element.selectedIndex = -1;
									option.attr("selected");
								}
								input_element.append(option);
							});
						}
						if (input.interval) {
							var min = input.interval[0];
							var max = input.interval[1];
							var inc = (min < max) ? 1 : -1;
							if (input.interval.length > 2) {
								inc *= input.interval[2];
							}
							var index;
							for (index = min; index * inc <= max * inc; index += inc ) {
								input_element.append(createElement('option', index).attr("value",index));
							}
						}
					}
				}
				if (input.type === 'radio') {
					if (input.value) {
						self.setValue(key, input.value);
					}
					input_element.on('click', function() {
						self.validate(key);
					});
				} else {
					if (input.value) {
						self.setValue(key, input.value);
					}
					input_element.on('input', function() {
						self.validate(key, self.options('skipOnInput'));
					});
					input_element.on('change, blur', function() {
						self.validate(key);
					});
				}
				// 'enter' to submit form
				if (!input_element.is('textarea')) {
					input_element.keypress(function (e) {
						if (e.which == 13) {
							self.validate($(e.currentTarget).attr('name'));
							self.submitForm();
							return false;
						}
					});
				}
				// autofill
				input_element.on('change.autofill DOMAttrModified.autofill keydown.autofill propertychange.autofill', function (e) {
					setTimeout( function () {
						if (input_element.val() !== '') {
							input_element.trigger('input');
						}
					}, 0);
				});
				var val_element = input_element;
				if (input.type === 'radio') {
					val_element = $el.find('input[name="' + key + '"]').last();
					if (val_element.next('label[for="' + val_element.attr('id') + '"]').length) {
						val_element = val_element.next('label[for="' + val_element.attr('id') + '"]');
					}
				}
				if (!$el.find(getByOuterElement(self.options('validationMessageElement'), key)).length && !$el.find(getByOuterElement(self.options('validationOkElement'), key)).length) {
					val_element.after(createElement(self.options('validationMessageElement'), '').attr('name', key).hide()).
						after(createElement(self.options('validationOkElement'), self.options('validationOkText')).attr('name', key).hide());
				}
				var has_validator = false;
				if (input.conditions && input.conditions.length) {
					input.conditions.some(function(entry) {
						if (entry.type === 'validator') {
							has_validator = true;
							return;
						}
					});
				}
				if (has_validator) {
					if (!$el.find(getByOuterElement(self.options('validationWorkingElement'), key)).length) {
						val_element.after(createElement(self.options('validationWorkingElement'), '').attr('name', key).hide());
					}
				}
				self.hideValidationOk(key);
				self.hideValidationMsg(key);
				self.hideValidationWorking(key);

				if (input.value && self.options('prevalidation')) {
					self.validate(key);
				}
			}
		});

		this.revalidateAll = function(partial, skip_validators) {
			var topElement = null;
			var all_ok = true;
			var i = 0;
			var self = this;
			Object.keys(self._parameters.values).forEach(function(key) {
				var input = self._parameters.values[key];
				if (input.type !== 'hidden') {
					if (!input.validated || input.revalidate) {
						var element = self.getInput(key);
						if (element.parent().is(":visible")) {
							if (!partial || input.validated === null || input.revalidate) {
								self.validate(key, skip_validators);
							}
							var prev_validators = self.validators_to_go;
							if (input.validated === false) {
								all_ok = false;
								if (self.validators_to_go === prev_validators) {
									topElement = firstElement(element, topElement);
									setTimeout( function() {
										self.options('validationMessageFlash')($(outerElement(self.options('validationMessageElement')) + '[name="' + key + '"]').first());
									}, self.options('validationMessageFlashDelay')*i++);
								}
							}
						}
					}
				}
			});
			if (!all_ok) {
				if (topElement && self.options('scrollToErrorEnabled')) {
					if (!self.validators_to_go) {
						$('html, body').animate({
							scrollTop: topElement
						}, self.options('scrollToErrorDuration'));
					} else {
						self.first_unvalidated = topElement;
					}
				}
				return false;
			}
			return true;
		};

		this.ajaxSubmit = function() {
			var self = this;
			var submitData = {};
			var updateNeeded = false;
			Object.keys(self._parameters.values).forEach(function(key) {
				var value;
				var changed = false;
				if (self._parameters.alwaysSubmit) {
					changed = true;
					updateNeeded = true;
				} else {
					if (self._parameters.values[key].type === 'hidden') {
						value = self._parameters.values[key].value;
						changed = true;
					} else if (!self._parameters.values[key].match) {
						value = self.getValue(key);
						if (typeof value === 'string') {
							value = value.trim();
						}
						changed = (value != self._parameters.values[key].value && ( (value !== null && value !== '') || (self._parameters.values[key].value !== null && self._parameters.values[key].value !== '') ) );
						if (changed) {
							updateNeeded = true;
						}
					}
				}
				if (changed) {
					if (self._parameters.values[key].prefix) {
						if (!(self._parameters.values[key].prefix in submitData)) {
							submitData[self._parameters.values[key].prefix] = {};
						}
						submitData[self._parameters.values[key].prefix][key] = value;
					} else {
						submitData[key] = value;
					}
				}
			});

			if ( !updateNeeded && !Object.keys(submitData).length ) {
				if (self._parameters.displayElement) {
					$(self._parameters.element).hide(self.options('animationFastSpeed'));
					if (self._parameters.editLink) {
						$(self._parameters.editLink).show();
					}
				}
				return;
			}
			if (self.options('beforeSubmit')) {
				self.options('beforeSubmit')(self);
			}
			// show working animation
			if (self.options('submitLoadingElement')) {
				$(self.options('submitLoadingElement')).show();
			}
			var request = $.ajax({
				url: self.options('submitUrl'),
				type: 'POST',
				data: JSON.stringify(submitData),
				dataType: 'json',
				timeout: self.options('submitTimeout'),
				cache: false,
				success: function(data) {
					if (self._parameters.displayElement || self._parameters.editLink) {
						$(self._parameters.element).hide(self.options('animationFastSpeed'));
						if (self._parameters.editLink) {
							$(self._parameters.editLink).show();
						}
					}
					if (typeof self.options('submitHandlers').success === "function") {
						self.options('submitHandlers').success(data, self, submitData);
					}
				},
				error: function(data) {
					if (typeof self.options('submitHandlers').error === "function") {
						self.options('submitHandlers').error(data, self, submitData);
					}
				},
				async: true
			}).always(function () {
				if (typeof self.options('submitHandlers').always === "function") {
					self.options('submitHandlers').always(self, submitData);
				}
			});
		};

		// submit form
		this.submitForm = function(ev) {
			if (!self.revalidateAll(true)) {
				if (self.validators_to_go > 0) {
					self.after_validators = function() {
						if (self.options('submitMethod') !== null) {
							return self.options('submitMethod')(self);
						} else {
							return self.ajaxSubmit();
						}
					};
				}
				if (ev !== null && typeof ev === 'object') {
					ev.preventDefault();
				}
				return false;
			}
			if (ev !== null && typeof ev === 'object') {
				ev.preventDefault();
			}
			if (self.options('submitMethod') !== null) {
				return self.options('submitMethod')(self);
			} else {
				return self.ajaxSubmit();
			}
			return false;
		};

		if ($el.is('form') || $el.find('form').length) {
			var form = $el.is('form') ? $el : $el.find('form').first();
			form.bind('submit', function(ev){
				self.submitForm(ev);
				return false;
			});
		}
		$el.find(this.options('submitElement')).on('click', function(ev){
			self.submitForm(ev);
			return false;
		});

	};

	$.fn.tdp = function(methodOrOptions) {
		var method     = (typeof methodOrOptions === 'string') ? methodOrOptions : undefined;
		var args       = (arguments.length > 1) ? Array.prototype.slice.call(arguments, 1)[0] : undefined;
		var options;
		var tdpPlugins = [];
		var results    = [];

		function getTdpPlugin( ) {
			var $el       = $(this);
			var tdpPlugin = $el.data('TdpPlugin');
			tdpPlugins.push(tdpPlugin);
		}
		function applyMethod( index ) {
			var tdpPlugin = tdpPlugins[index];
			if (!tdpPlugin) {
				console.warn('$.TdpPlugin not instantiated yet');
				console.info(this);
				results.push(undefined);
				return;
			}
			if (typeof tdpPlugin[method] === 'function') {
				var result = tdpPlugin[method].apply(tdpPlugin, args);
				results.push(result);
			} else {
				console.warn('Method \'' + method + '\' not defined in $.TdpPlugin');
			}
		}
		function init() {
			var $el = $(this);
			var tdpPlugin = new TdpPlugin($el, options, args);
			$el.data('TdpPlugin', tdpPlugin);
		}

		if (method) {
			this.each(getTdpPlugin);
			this.each(applyMethod);
			return (results.length > 1) ? results : results[0];
		} else {
			options = (typeof methodOrOptions === 'object') ? methodOrOptions : undefined;
			return this.each(init);
		}
	};
})(jQuery);
