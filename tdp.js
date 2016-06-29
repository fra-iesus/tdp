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
			scrollToErrorDuration: 2000,
			dialogShowDuration: 500,
			dialogCloseDuration: 500,
			dialogAutoclose: false,
			validationOkElement: 'span.tdp-vld-ok',
			validationOkShow: function(el) {
				return el.fadeIn('slow');
			},
			validationOkHide: function(el) {
				return el.fadeOut('fast');
			},
			validationWorkingElement: 'span.tdp-vld-working',
			validationWorkingShow: function(el) {
				return el.fadeIn('slow');
			},
			validationWorkingHide: function(el) {
				return el.fadeOut('fast');
			},
			validationMessageElement: 'span.tdp-vld-msg',
			validationMessageSeparator: '<br />',
			validationMessageProcessor: function(message) {
				return message.join(self.options('validationMessageSeparator'));
			},
			validationMessageFlashDelay: 300,
			validationMessageFlash: function(el) {
				return el.fadeIn('slow').fadeOut('slow').fadeIn('slow').fadeOut('slow').fadeIn('slow');
			},
			validationMessageShow: function(el) {
				return el.fadeIn('slow');
			},
			validationMessageHide: function(el) {
				return el.fadeOut('fast');
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
			submitMethod: null, // directly submit form
			verbose: false,
			logger: null
		};
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

		if (!parameters || typeof(parameters) !== 'object') {
			if (options && typeof(options) === 'object') {
				parameters = options;
				options = {};
			} else {
				return console.log('$.TdpPlugin constructor called without mandatory parameters');
			}
		}
		if (!options || typeof(options) !== 'object') {
			options = {};
		}
		this._options = $.extend( true, {}, this._defaults, options );
		this._parameters = parameters;

		//html element creator
		function createElement(el, html) {
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

		// validator
		Object.keys(this._parameters.values).forEach(function(key) {
			var input = self._parameters.values[key];
			input.validated = null;
			input.old_value = null;
			$el.find('input[name="' + key + '"],textarea[name="' + key + '"],select[name="' + key + '"]').each(function() {
				input_element = $(this);
				if (input.type === 'select' && input.values) {
					// for select set allowed values if defined
					$el.find("option").remove();
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
						input_element.append(option);
					});
				}
				if (!$(self.options('validationMessageElement') + '[name="' + key + '"]').length && !$(self.options('validationOkElement') + '[name="' + key + '"]').length) {
					input_element.after(createElement(self.options('validationMessageElement'), '').attr('name', key).hide()).
						after(createElement(self.options('validationOkElement'), '✓').attr('name', key).hide());
				}
				input_element.val(input.value);
				self.options('validationMessageHide')($(self.options('validationMessageElement') + '[name="' + key + '"]').first());
				self.options('validationOkHide')($(self.options('validationOkElement') + '[name="' + key + '"]').first());
				input_element.on('input', function() {
					self.validate(this, ['validator', 'min', 'not']);
				});
				input_element.on('change, blur', function() {
					self.validate(this);
				});
			});
		});
		if (this.options('logger') && $(this.options('logger')).length) {
			this._log = $(this.options('logger'));
		} else {
			this._log = null;
		}
		$el.submit(function(ev){
			var errElement = null;
			var i = 0;
			Object.keys(self._parameters.values).forEach(function(key) {
				var input = self._parameters.values[key];
				if (!input.validated) {
					var element = $el.find('input[name="' + key + '"],textarea[name="' + key + '"],select[name="' + key + '"]').first();
					if (input.validated === null) {
						self.validate(element);
					}
					if (!errElement) {
						errElement = element;
					}
					setTimeout( function() {
						self.options('validationMessageFlash')($(self.options('validationMessageElement' + '[name="' + key + '"]')).first());
					}, self.options('validationMessageFlashDelay')*i++);
				}
			});
			if (errElement) {
				$('html, body').animate({
					scrollTop: errElement.offset().top
				}, self.options('scrollToErrorDuration'));
				return false;
			}
			if (self.options('submitMethod') !== null) {
				ev.preventDefault();
				return self.options('submitMethod')();
			}
			return true;
		});

		// show dialogue
		this.show = function() {
			$el.show(this.options('dialogShowDuration'));
			return $el;
		};
		// hide dialogue
		this.hide = function() {
			$el.hide(this.options('dialogCloseDuration'));
			return $el;
		};

		// validate input
		this.validate = function( input, skip_validators ) {
			var $input = (input instanceof jQuery ? input : $(input));
			var self = this;
			if ( $input.is('input,textarea,select') ) {
				var tdp = this;
				var name = $input.attr('name');
				if ( name in this._parameters.values ) {
					var value = $input.val();
					var validation_msg = $(self.options('validationMessageElement') + '[name="' + name + '"]').first();
					var validation_ok = $(self.options('validationOkElement') + '[name="' + name + '"]').first();
					var definition = this._parameters.values[name];
					if (value === definition.old_value) {
						return;
					}
					if (!skip_validators) {
						definition.old_value = value;
					}
					var results = [];
					var later = false;
					if (!definition.conditions || !definition.conditions.length) {
						definition.validated = true;
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
						if (tdp._log !== null) {
							tdp._log.append("Evaluating condition '" + entry.type + "(" + t1 + ", " + t2 + ")'\n");
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
								result = !Number.isNaN(t1);
								break;
							case 'valid':
								result = t1 == value;
								break;
							case 'min':
								result = !Number.isNaN(t1) && t1 >= t2;
								break;
							case 'max':
								result = !Number.isNaN(t1) && t1 <= t2;
								break;
							case 'validator':
								self.options('validationWorkingShow')($(self.options('validationWorkingElement') + '[name="' + name + '"]').first());
								later = true;
								var request = $.ajax({
									url: entry.value,
									type: 'POST',
									data: self.options('validatorRequestProcessor')(value, entry.params),
									dataType: 'json',
									timeout: 5000,
									cache: false,
									success: function(data) {
										var message = self.options('validatorResponseProcessor')(data);
										var result = false;
										if (typeof message === 'string') {
											definition.validated = 0;
											result = self.options('validationMessageProcessor')([message]);
											// for global search of error message element
											// $(self.options('validationMessageElement') + '[name="' + name + '"]').html(result);
										} else {
											definition.validated = !message;
											result = message ? entry.message : false;
										}
										if (!result) {
											self.options('validationMessageHide')(validation_msg);
											self.options('validationOkShow')(validation_ok);
										} else {
											validation_msg.html(result);
											self.options('validationMessageShow')(validation_msg);
											self.options('validationOkHide')(validation_ok);
										}
									},
									error: function(data) {
											definition.validated = 0;
											result = self.options('validationMessageProcessor')([entry.message]);
											validation_msg.html(result);
											self.options('validationMessageShow')(validation_msg);
											self.options('validationOkHide')(validation_ok);
									},
									async: true
								}).always(function () {
									self.options('validationWorkingHide')($(self.options('validationWorkingElement') + '[name="' + name + '"]').first());
								});
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
					definition.validated = (results.length === 0);
					var result = this.options('validationMessageProcessor')(results);
					// for global search of error message element
					// $(this.options('validationMessageElement') + '[name="' + name + '"]').html(result);
					if (!result) {
						this.options('validationMessageHide')(validation_msg);
						if (!skip_validators && !later) {
							this.options('validationOkShow')(validation_ok);
						}
					} else {
						validation_msg.html(result);
						this.options('validationMessageShow')(validation_msg);
						this.options('validationOkHide')(validation_ok);
					}
					return definition.validated;
				} else {
					console.warn('Input "' + name + '" is not defined for validation');
				}
			} else {
				console.warn('Element "' + input + '" is not valid input');
			}
		};
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
			var $el          = $(this);
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
