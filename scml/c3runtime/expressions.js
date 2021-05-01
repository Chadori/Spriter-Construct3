"use strict";

{
	const C3 = self.C3;
	
	C3.Plugins.Spriter.Exps =
	{
		// Double(number)
		// {
			// return number * 2;
		// }
		
		time()
		{
			return this.E__time();
		},
		
		val(varname, objectName)
		{
			return this.E__val(varname, objectName);
		},
		pointX(name)
		{
			return this.E__pointX(name);
		},

		pointY(name)
		{
			return this.E__pointY(name);
		},

		pointAngle(name)
		{
			return this.E__pointAngle(name);
		},
		
		objectX(name)
		{
			return this.E__objectX(name);
		},

		objectY(name)
		{
			return this.E__objectY(name);
		},

		objectAngle(name)
		{
			return this.E__objectAngle(name);
		},

		timeRatio()
		{
			return this.E__timeRatio();
		},

		ScaleRatio()
		{
			return this.E__ScaleRatio();
		},

		key()
		{
			return this.E__key();
		},

		PlayTo()
		{
			return this.E__PlayTo();
		},

		animationName()
		{
			return this.E__animationName();
		},

		animationLength()
		{
			return this.E__animationLength();
		},

		speedRatio()
		{
			return this.E__speedRatio();
		},

		secondAnimationName()
		{
			return this.E__secondAnimationName();
		},

		entityName()
		{
			return this.E__entityName();
		},

		PlayToTimeLeft()
		{
			return this.E__PlayToTimeLeft();
		},
		triggeredSound()
		{
			return this.E__triggeredSound();
		},

		triggeredSoundTag()
		{
			return this.E__triggeredSoundTag();
		},

		soundVolume(soundTag)
		{
			return this.E__soundVolume(soundTag);
		},

		soundPanning(soundTag)
		{
			return this.E__soundPanning(soundTag);
		},

		blendRatio()
		{
			return this.E__blendRatio();
		},

		Opacity()
		{
			return this.E__Opacity();
		},

		BBoxLeft()
		{
			return this.E__BBoxLeft();
		},

		BBoxTop()
		{
			return this.E__BBoxTop();
		},

		BBoxRight()
		{
			return this.E__BBoxRight();
		},

		BBoxBottom()
		{
			return this.E__BBoxBottom();
		},

		foundObject()
		{
			return this.E__foundObject();
		},

		ZElevation()
		{
			return this.E__ZElevation();
		},

		TotalZElevation()
		{
			return this.E__TotalZElevation();
		}
	};
	
}