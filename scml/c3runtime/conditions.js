"use strict";

{
	const C3 = self.C3;
	
	C3.Plugins.Spriter.Cnds =
	{		
		readyForSetup()
		{
			return this.C__readyForSetup();
		},

		outsidePaddedViewport()
		{
			return this.C__outsidePaddedViewport();
		},

		actionPointExists (pointName)
		{
			return this.C__actionPointExists(pointName);
		},
		
		objectExists (pointName)
		{
			return this.C__objectExists(pointName);
		},
		
		OnAnimFinished (animname)
		{
			return this.currentAnimation.name.toLowerCase() === animname.toLowerCase();
		},
		
		OnSoundTriggered()
		{
			return true;
		},
		
		OnEventTriggered (name)
		{
			if (name === this.eventToTrigger)
			{
				return true;
			}
		},

		tagActive (tagName, objectName)
		{
			return this.C__tagActive(tagName, objectName);
		},

		OnSoundVolumeChangeTriggered()
		{
			return true;
		},
		
		OnSoundPanningChangeTriggered()
		{
			return true;
		},
		
		OnAnyAnimFinished()
		{
			return true;
		},
		
		// AddCmpParam("Current Key Frame is ", "Is the current Key Frame <,>,=,etc to the value below");
		// AddNumberParam("Frame","The frame number to compare the current key frame to" ,"0")	;
		// AddCondition(2,0, "Compare Current Key Frame", "Key Frames", "Current Key Frame is {0} {1}", "Compare the current key frame number.", "CompareCurrentKey");
		CompareCurrentKey (cmp, frame)
		{
			return this.C__CompareCurrentKey(cmp, frame);
		},     
		OnURLLoaded() {
            return true;
        },
        OnURLFailed() {
            return true;
        },
		
		// AddCmpParam("Current Animation Time is ", "Is the current time <,>,=,etc to the value below");
		// AddNumberParam("Time","The time to compare the current key frame to" ,"0")	;
		// AddComboParamOption("milliseconds");
		// AddComboParamOption("ratio of the animation length");
		// AddComboParam("Time Format", "Is the 'Time' value above expressed in milliseconds or as a ratio",0);
		// AddCondition(3,0, "Compare Current Time", "Animations", "Current Time is {0} {1} {2}", "Compare the current time.", "CompareCurrentTime");
		CompareCurrentTime (cmp, time, format)
		{
			return this.C__CompareCurrentTime (cmp, time, format);
		},

		// AddStringParam("Animation", "Is this the current animation.");
		// AddCondition(4, 0, "Compare Current Animation", "Animations", "Is current animation {0}", "Compare the name of the current animation.", "CompareAnimation");
		CompareAnimation (name)
		{
			return this.C__CompareAnimation(name);
		},

		CompareSecondAnimation (name)
		{
			return this.C__CompareSecondAnimation(name);
		},

		// AddStringParam("Entity", "Is this the current entity.");
		// AddCondition(16, 0, "Compare Current Entity", "Entities", "Is current entity {0}", "Compare the name of the current entity.", "CompareEntity");
		CompareEntity (name)
		{
			return this.C__CompareEntity(name);
		},

		// AddCondition(5, 0, "Is Paused", "Animations", "If animation is paused", "Is animation paused?", "AnimationPaused");
		AnimationPaused()
		{
			return this.C__AnimationPaused();
		},
		// AddCondition(6, 0, "Is Looping", "Animations", "If animation is looping", "Is animation set to loop?", "AnimationLooping");
		AnimationLooping()
		{
			return this.C__AnimationLooping();
		},

		isMirrored()
		{
			return this.C__isMirrored();
		},

		isFlipped()
		{
			return this.C__isFlipped();
		},
		
		CompareZElevation(which, comparison, z_elevation)
		{
			return this.C__CompareZElevation(which, comparison, z_elevation);
		}
		
		
		
	};
}