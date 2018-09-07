# tdp
### Current version: 1.1

Tiny Dialogue Plugin - jQuery Plugin for Forms processing and validation

## VERY BASIC DESCRIPTION:

### Available input types:
- tel / email / password / text (as input or textarea) - processed the same way
- date (only partial support, more is provided for date parts)
- integer / float
- chackbox / radio
- select (including content generator for values and intervals - both ascending and descending with steps)
- hidden (no processing currently directly supported - but some may work :-))

### Available validation types:
- regular (test value against regular expression)
- not (test if value is NOT equal to tested one)
- notNaN (test if value is not NaN nor undefined)
- valid (test if value if valid - useful for numbers)
- min / max (define bounds for numerical/date values or string length)
- match (test if value is the same as in some other tested input - good for password confirmation)
- date (test if entered date is valid one, eg. it's not 31st of February etc.)
- age (test entered date for age - currently supported only for partial date inputs = year, month & day in separated inputs)
- custom online validator (tests against defined online validator - good for email addresses)
- conditioned validations (use 'is_condition':'name' ---> 'conditioned':'name' in condition definitions)

### A few words about possibilities:
- supports multiple independent forms / dialogs on same page without any kind of interference
- supports forms and custom elements containing inputs
- support various kinds of validation messages elements and infinite number of validations for every input (althrough there can be defined process breaks for not successfull validations)
- support nested validation messages / statuses elements (eg. "div.validation-msg div.nice-popup span.text")
- almost everything is customizable
- different validations are processed in different moments (there's no need to test minimal length of string input, while user is still typing, althrough it makes sense to test for maximal length and so on)
- supports console (user defined html element) for logs

Full documentation is a part of todo :-)
See demo for usage and plugin code (especially default values) for all the ways you can customize the plugin

### Basic usage:
```html
<form id="form01" method="POST">
  Name: <input name="name" type="text" /><br />
  Phone number: <input name="phone" type="tel" /><br />
  Date of birth: <select name="day"></select> <select name="month"></select> <select name="year"></select><br />
  Password: <input name="password" type="password" /><br />
  Confirm password: <input name="password_confirmation" type="password" /><br />
  <div class="register-button"><button class="button1"><span>Save</span></button></div>
</form>
<br />
<textarea class="console">MESSAGES:
</textarea>
<script>
$('form#form01').tdp({
	submitElement: 'div.register-button button',
	validationMessageSeparator: ' + ',
	validationMessageElement: 'span.tdp-vld-msg span.text span',
  logger: 'textarea.console'
}, {
	values: {
		name: {
			value: '',
			type: 'text',
			conditions: [
				{type: 'min', value: 1, message: 'Hey, what\'s your name?'},
				{type: 'max', value: 1000, message: 'Your name seems to be toooooo loooong'}
			]
		},
		phone: {
			value: '+1',
			type: 'text',
			conditions: [
				{type: 'regular', value: '^\\+', message: 'Please use phone number in international format (+XXX)', last: true},
				{type: 'min', value: 9, message: 'Phone number is too short'},
 				{type: 'regular', value: '^\\+([0-9]\\ *){10,12}$', message: 'Invalid phone number format'}
			]
		},
		day: {
			value: '',
			type: 'select',
			values: [ [ '', 'Day' ] ],
			interval: [	1, 31 ],
			conditions: [
				{type: 'not', value: '', message: 'Select day of birth', last: 1},
				{type: 'date', value: ['year', 'month', 'day'], message: 'Entered date is not valid'},
        {type: 'age', value:  ['year', 'month', 'day', 18], message: 'You must be at least 18 years old to do anything here'}
			]
		},
		month: {
			value: '',
			type: 'select',
			values: [ [ '', 'Month' ] ],
			interval: [	1, 12 ],
			conditions: [
				{type: 'not', value: '', message: 'Select month of birth', last: 1},
				{type: 'date', value: ['year', 'month', 'day'], message: 'Entered date is not valid'},
        {type: 'age', value:  ['year', 'month', 'day', 18], message: 'You must be at least 18 years old to do anything here'}
			]
		},
		year: {
			value: '',
			type: 'select',
			values: [ [ '', 'Year' ] ],
			interval: [	1916, 2000 ],
			conditions: [
				{type: 'not', value: '', message: 'Select year of birth', last: 1},
				{type: 'date', value: ['year', 'month', 'day'], message: 'Entered date is not valid'},
        {type: 'age', value:  ['year', 'month', 'day', 18], message: 'You must be at least 18 years old to do anything here'}
			]
		},
		password: {
			value: '',
			type: 'password',
			conditions: [
				{type: 'min', value: 6, message: 'Password is too easy to guess'},
				{type: 'max', value: 100, message: 'huh, too long to remember, isn\'t it?'}
			]
		},
		password_confirmation: {
			value: '',
			type: 'password',
			conditions: [
				{type: 'match', value: 'password', message: 'Both passwords should match'}
			]
		}
	}	
});
</script>
```

## HISTORY/CHANGELOG:

- conditioned validations added (eg. input could be validated against email validator of phone number validator based on its content)
- validation callbacks added
- fixed checkboxes
- added helpers for working with validation elements (hide, show)
- added methods reset and setValue
- hidden inputs are not validated anymore
- added notEmptyAsValidated parameter
- added animationSpeed and animationFastSpeed parameters
- added errorMessageEmptyInput parameter
- added prevalidation switch
- added 'empty' attribute for input
- fixed radios processing
- better work with elements on page with multiple forms

### 1.1
2016-06-30
- "good enough" release :-)
- fixed critical issue preventing form submit
- a lot of fixes and improvements

### 1.0
2016-06-29
- initial release

## TODO:

- full documentation (examples)
- custom validation functions
- converters (convert data from one/multiple input(s) to another)
- edit/view switch
- full form html generator
- different validation message elements for some messages
- methods for adding/removal of validation conditions for inputs (to be able to modify it dynamically after init)
