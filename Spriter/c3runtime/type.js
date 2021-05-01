"use strict";

{
	const C3 = self.C3;

	C3.Plugins.Spriter.Type = class SpriterType extends C3.SDKTypeBase
	{
		constructor(objectClass)
		{
			super(objectClass);
		}
		
		Release()
		{
			super.Release();
		}
		
		
		OnCreate()
		{
			this.GetObjectClass().GetAnimations()[0].GetFrames()[0].GetImageInfo().LoadAsset(this._runtime);
			this.doGetFromPreload = false;
			this.scmlFiles = {};
			this.scmlReserved = {};
			this.scmlInstsToNotify = {};
			this.objectArrays = [];
			this.boneWidthArrays = [];

			this.sheetTex = {};
		}

		// LoadTextures(renderer)
		// {
			// var imageInfo = this.GetObjectClass().GetAnimations()[0].GetFrames()[0].GetImageInfo();
			 // return imageInfo.LoadStaticTexture(renderer, 
				// { linearSampling: this._runtime.IsLinearSampling() });
		// }
		
		LoadTextures(renderer)
		{
			var imageInfo = this.GetObjectClass().GetAnimations()[0].GetFrames()[0].GetImageInfo();
			return imageInfo.LoadStaticTexture(renderer, {
				sampling: this._runtime.GetSampling()
			});
		}

		ReleaseTextures()
		{
			var imageInfo = this.GetObjectClass().GetAnimations()[0].GetFrames()[0].GetImageInfo();
			imageInfo.ReleaseTexture();
		}	
		
		_UpdateAllCurrentTexture() 
		{
            for (const inst of this._objectClass.instancesIncludingPendingCreate())
                inst.GetSdkInstance()._UpdateCurrentTexture()
        }
		
		frame_getDataUri()
		{
			if (this.datauri.length === 0)
			{
				// Get Sprite image as data URI
				var tmpcanvas = document.createElement("canvas");
				tmpcanvas.width = this.width;
				tmpcanvas.height = this.height;
				var tmpctx = tmpcanvas.getContext("2d");

				if (this.spritesheeted)
				{
					tmpctx.drawImage(this.texture_img, this.offx, this.offy, this.width, this.height,
						0, 0, this.width, this.height);
				}
				else
				{
					tmpctx.drawImage(this.texture_img, 0, 0, this.width, this.height);
				}

				this.datauri = tmpcanvas.toDataURL("image/png");
			}

			return this.datauri;
		};
	};
}