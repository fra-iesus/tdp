# tdp
current version: 1.1

Tiny Dialogue Plugin - jQuery Plugin for Forms processing and validation

VERY BASIC DESCRIPTION:

Available input types:
- tel / email / password / text (as input or textarea) - processed the same way
- date (only partial support, more is provided for date parts)
- integer / float
- chackbox / radio
- select (including content generator for values and intervals - both ascending and descending with steps)
- hidden (no processing currently directly supported - but some may work :-))

Available validation types:
- regular (test value against regular expression)
- not (test if value is NOT equal to tested one)
- notNaN (test if value is not NaN nor undefined)
- valid (test if value if valid - useful for numbers)
- min / max (define bounds for numerical/date values or string length)
- match (test if value is the same as in some other tested input - good for password confirmation)
- date (test if entered date is valid one, eg. it's not 31st of February etc.)
- age (test entered date for age - currently supported only for partial date inputs = year, month & day in separated inputs)
- custom online validator (tests against defined online validator - good for email addresses)

A few words about possibilities:
- supports multiple independent forms / dialogs on same page without any kind of interference
- supports forms and custom elements containing inputs
- support various kinds of validation messages elements and infinite number of validations for every input (althrough there can be defined process breaks for not successfull validations)
- support nested validation messages / statuses elements (eg. "div.validation-msg div.nice-popup span.text")
- almost everything is customizable
- different validations are processed in different moments (there's no need to test minimal length of string input, while user is still typing, althrough it makes sense to test for maximal length and so on)

Full documentation is a part of todo :-)
See demo for basic usage and plugin code (especially default values) for all the ways you can customize the plugin


HISTORY/CHANGELOG:

1.1
- "good enough" release :-)
- fixed critical issue preventing form submit
- a lot of fixes and improvements

1.0
- initial release

TODO:

- full documentation (examples)
- custom validation functions
- converters (convert data from one/multiple input(s) to another)
- edit/view switch
- full form html generator
- different validation message elements for some messages
