/* eslint-disable max-lines */

const CoverPageGen       = require('./snippets/coverpage.gen.js');
const dedent             = require('dedent-tabs').default;



module.exports = [

	/************************* MAGE ********************/

	{
		groupName : 'Modern Age',
		icon      : 'fas fa-book',
		view      : 'text',
		snippets  : [
			{
				name : 'Note',
				icon : 'fas fa-sticky-note',
				gen  : function(){
					return dedent`
						{{note
						##### Time to Drop Knowledge
						Use notes to point out some interesting information.

						**Tables and lists** both work within a note.
						}}
						\n`;
				},
			},
			{
				name : 'Descriptive Text Box',
				icon : 'fas fa-comment-alt',
				gen  : function(){
					return dedent`
						{{descriptive
						##### Time to Drop Knowledge
						Use descriptive boxes to highlight text that should be read aloud.

						**Tables and lists** both work within a descriptive box.
						}}
						\n`;
				},
			},
			{
				name         : 'Front Cover Page',
				icon         : 'fac book-front-cover',
				gen          : CoverPageGen.front,
				experimental : true
			},
			{
				name         : 'Inside Cover Page',
				icon         : 'fac book-inside-cover',
				gen          : CoverPageGen.inside,
				experimental : true
			},
			{
				name      		 : 'Back Cover Page',
				icon      		 : 'fac book-back-cover',
				gen       		 : CoverPageGen.back,
				experimental : true
			},
		]
	}
];
