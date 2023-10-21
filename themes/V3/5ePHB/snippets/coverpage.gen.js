const _ = require('lodash');
const dedent = require('dedent-tabs').default;

module.exports = {

	front : function() {
		return dedent`
		  {{frontCover}}
		  ![background image](/assets/MAGE/MAGE-Proxy-cover.png){position:absolute,bottom:0,left:0,height:100%}
		  ![AGE Creators Alliance Logo](/assets/MAGE/AGE_CreatorsAlliance_logo.png){position:absolute,bottom:0,left:0,height:1.22in}
		  ![Modern Age Compatible Logo](/assets/MAGE/ModernAGE_compatability_logo.png){position:absolute,bottom:0,right:0,height:1.15in}
		  \page`;
	},

	inside : function() {
		return dedent`
		{{insideCover}}

		# Product Title
		
		{{credits
		:
		## **Lead Design and Development:** Text: Credits Large
		:
		### **Writing and Design: Text:** Credits Small
		:
		### **Adventure Game Engine (AGE) Created by** Chris Pramas
		}}
		
		{{credits-copyright-gr
		*Modern AGE is © 2018-2021 Green Ronin Publishing, LLC. All rights reserved. Reference to other copyrighted material in no way constitutes a challenge to the respective copyright holders of that material.*
		
		*Modern AGE, Green Ronin, Adventure Game Engine, and their associated logos are trademarks of Green Ronin Publishing.*
		:
		:
		:
		{{credits-copyright-CA-Member
		All other original material in this work is copyright [year] by [your legal name or company name] and published under the Community Content Agreement for Modern AGE XXXXXXXXXX.
		}}
		}}
		
		{{TitlePageBlackBox
		![AGE Creators Alliance Logo](/assets/MAGE/AGE_CreatorsAlliance_logo.png){ageCALogo}
		![Modern Age Compatible Logo](/assets/MAGE/ModernAGE_compatability_logo.png){mageCompatLogo}
		}}
		\page
		`;
	},

	part : function() {
		return dedent`
			{{partCover}}

			# PART X
			## 

			{{imageMaskEdge${_.random(1, 8)},--offset:10cm,--rotation:180
			  ![Background image](https://i.imgur.com/9TU96xY.jpg){position:absolute,bottom:0,left:0,height:100%}
			}}

			\page`;
	},

	back : function() {
		return dedent`
			{{backCover}}

			# 

			
			___

			For use with any fantasy roleplaying ruleset. Play the best game of your life!

			![background image](https://i.imgur.com/MJ4YHu7.jpg){position:absolute,bottom:0,left:0,height:100%}

			{{logo
			![](/assets/naturalCritLogoWhite.svg)

			Homebrewery.Naturalcrit.com
			}}

			\page`;
	}
};
