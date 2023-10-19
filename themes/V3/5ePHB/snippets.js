/* eslint-disable max-lines */

const MagicGen           = require('./snippets/magic.gen.js');
const ClassTableGen      = require('./snippets/classtable.gen.js');
const MonsterBlockGen    = require('./snippets/monsterblock.gen.js');
const scriptGen          = require('./snippets/script.gen.js');
const ClassFeatureGen    = require('./snippets/classfeature.gen.js');
const CoverPageGen       = require('./snippets/coverpage.gen.js');
const TableOfContentsGen = require('./snippets/tableOfContents.gen.js');
const indexGen           = require('./snippets/index.gen.js');
const QuoteGen 			 = require('./snippets/quote.gen.js');
const dedent             = require('dedent-tabs').default;



module.exports = [

	{
		groupName : 'Text Editor',
		icon      : 'fas fa-pencil-alt',
		view      : 'text',
		snippets  : [
			{
				name : 'Table of Contents',
				icon : 'fas fa-book',
				gen  : TableOfContentsGen
			},
			{
				name         : 'Index',
				icon         : 'fas fa-bars',
				gen          : indexGen,
				experimental : true
			}
		]
	},
	{
		groupName : 'Style Editor',
		icon      : 'fas fa-pencil-alt',
		view      : 'style',
		snippets  : [
			{
				name : 'Remove Drop Cap',
				icon : 'fas fa-remove-format',
				gen  : dedent`/* Removes Drop Caps */
						.page h1+p:first-letter {
							all: unset;
						}\n\n
						/* Removes Small-Caps in first line */
						.page h1+p:first-line {
							all: unset;
						}`
			},
			{
				name : 'Tweak Drop Cap',
				icon : 'fas fa-sliders-h',
				gen  : dedent`/* Drop Cap settings */
						.page h1 + p::first-letter {
							font-family: SolberaImitationRemake;
							font-size: 3.5cm;
							background-image: linear-gradient(-45deg, #322814, #998250, #322814);
							line-height: 1em;
						}\n\n`
			}
		]
	},



	/************************* PHB ********************/

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
				name         : 'Part Cover Page',
				icon         : 'fac book-part-cover',
				gen          : CoverPageGen.part,
				experimental : true
			},
			{
				name      		 : 'Back Cover Page',
				icon      		 : 'fac book-back-cover',
				gen       		 : CoverPageGen.back,
				experimental : true
			},
		]
	},



	/*********************  TABLES *********************/

	{
		groupName : 'Tables',
		icon      : 'fas fa-table',
		view      : 'text',
		snippets  : [
			{
				name        : 'Class Tables',
				icon        : 'fas fa-table',
				gen         : ClassTableGen.full('classTable,frame,decoration,wide'),
				subsnippets : [
					{
						name : 'Martial Class Table',
						icon : 'fas fa-table',
						gen  : ClassTableGen.non('classTable,frame,decoration'),
					},
					{
						name : 'Martial Class Table (unframed)',
						icon : 'fas fa-border-none',
						gen  : ClassTableGen.non('classTable'),
					},
					{
						name : 'Full Caster Class Table',
						icon : 'fas fa-table',
						gen  : ClassTableGen.full('classTable,frame,decoration,wide'),
					},
					{
						name : 'Full Caster Class Table (unframed)',
						icon : 'fas fa-border-none',
						gen  : ClassTableGen.full('classTable,wide'),
					},
					{
						name : 'Half Caster Class Table',
						icon : 'fas fa-list-alt',
						gen  : ClassTableGen.half('classTable,frame,decoration,wide'),
					},
					{
						name : 'Half Caster Class Table (unframed)',
						icon : 'fas fa-border-none',
						gen  : ClassTableGen.half('classTable,wide'),
					},
					{
						name : 'Third Caster Spell Table',
						icon : 'fas fa-border-all',
						gen  : ClassTableGen.third('classTable,frame,decoration'),
					},
					{
						name : 'Third Caster Spell Table (unframed)',
						icon : 'fas fa-border-none',
						gen  : ClassTableGen.third('classTable'),
					}
				]
			},
			{
				name         : 'Rune Table',
				icon         : 'fas fa-language',
				gen          : scriptGen.dwarvish,
				experimental : true,
				subsnippets  : [
					{
						name : 'Dwarvish',
						icon : 'fac davek',
						gen  : scriptGen.dwarvish,
					},
					{
						name : 'Elvish',
						icon : 'fac rellanic',
						gen  : scriptGen.elvish,
					},
					{
						name : 'Draconic',
						icon : 'fac iokharic',
						gen  : scriptGen.draconic,
					},
				]
			},
		]
	},




	/**************** PAGE *************/

	{
		groupName : 'Print',
		icon      : 'fas fa-print',
		view      : 'style',
		snippets  : [
			{
				name : 'Ink Friendly',
				icon : 'fas fa-tint',
				gen  : dedent`
					/* Ink Friendly */
					*:is(.page,.monster,.note,.descriptive) {
						background : white !important;
						filter : drop-shadow(0px 0px 3px #888) !important;
					}

					.page img {
						visibility : hidden;
					}\n\n`
			},
		]
	}
];
