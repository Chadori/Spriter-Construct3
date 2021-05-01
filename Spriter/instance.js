"use strict";

{
	const SDK = self.SDK;

	const PLUGIN_CLASS = SDK.Plugins.Spriter;

	PLUGIN_CLASS.Instance = class SpriterInstance extends SDK.IWorldInstanceBase
	{
		constructor(sdkType, inst)
		{
			super(sdkType, inst);
			this.inst=inst;
		}
		Release()
		{
		}
		OnCreate()
		{
		}
		OnPropertyChanged(id, value)
		{
		}
		LoadC2Property(name, valueString)
		{
			return false;       // not handled
		}
		OnPlacedInLayout()
		{
			this.inst.SetSize(50,50);
		}
		
		HasDoubleTapHandler()
		{
			return true;
		}
		
		OnDoubleTap()
		{
			this.GetObjectType().EditImage();
		}
		
		Draw(iRenderer, iDrawParams)
		{
			// var animFrame=this.GetObjectType().GetAnimations()[0].GetFrames()[0];
			// var texture = null;
			// if(!animFrame.GetCachedWebGLTexture())
			// {
				// animFrame.LoadWebGLTexture();
			// }
			
			 // texture = animFrame.GetCachedWebGLTexture();
			
			// if (texture)
			// {
				// this._inst.ApplyBlendMode(iRenderer);
				// iRenderer.SetTexture(texture);
				// iRenderer.SetColor(this._inst.GetColor());
				// iRenderer.Quad3(this._inst.GetQuad(), this.GetTexRect());
			// }
			// else
			{
				// render placeholder
				iRenderer.SetAlphaBlend();
				iRenderer.SetColorFillMode();
				
				if (this.HadTextureError())
					iRenderer.SetColorRgba(0.25, 0, 0, 0.25);
				else
					iRenderer.SetColorRgba(0, 0, 0.1, 0.1);
				
				iRenderer.Quad(this._inst.GetQuad());
			}
		}
	};
}
