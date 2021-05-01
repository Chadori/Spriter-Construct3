"use strict";

{
	const C3 = self.C3;

	C3.Plugins.Spriter.Acts =
	{
		setPlaybackSpeedRatio(newSpeed)
		{
			this.A__setPlaybackSpeedRatio(newSpeed);
		},

		setVisible(visible)
		{
			this.A__setVisible(visible);
		},
		setOpacity(newOpacity)
		{
			this.A__setOpacity(newOpacity)
		},
		setAutomaticPausing(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer)
		{
			this.A__setAutomaticPausing(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer);
		},
		setObjectScaleRatio(newScale, xFlip, yFlip)
		{
			this.A__setObjectScaleRatio(newScale, xFlip, yFlip);
		},

		setObjectXFlip(xFlip)
		{
			this.A__setObjectXFlip(xFlip);
		},

		setIgnoreGlobalTimeScale(ignore)
		{
			this.A__setIgnoreGlobalTimeScale(ignore);
		},

		findSpriterObject(c2Object)
		{
			this.A__findSpriterObject(c2Object);
		},

		stopResumeSettingLayer(resume)
		{
			this.A__stopResumeSettingLayer(resume);
		},
		
		stopResumeSettingVisibilityForObjects(resume)
		{
			this.A__stopResumeSettingVisibilityForObjects(resume);
		},
		
		stopResumeSettingCollisionsForObjects(resume)
		{
			this.A__stopResumeSettingCollisionsForObjects(resume);
		},

		setObjectYFlip(yFlip)
		{
			this.A__setObjectYFlip(yFlip);
		},
		
		setC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
		{
			this.A__setC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName);
		},

		pinC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
		{
			this.A__pinC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName);
		},

		unpinC2ObjectFromSpriterObject(c2Object, spriterObjectName)
		{
			this.A__unpinC2ObjectFromSpriterObject(c2Object, spriterObjectName);
		},

		unpinAllFromSpriterObject(spriterObjectName)
		{
			this.A__unpinAllFromSpriterObject(spriterObjectName);
		},

		setAnimation(animName, startFrom, blendDuration)
		{
			this.A__setAnimation(animName, startFrom, blendDuration);
		},
		
		async LoadURL(url, crcrossOrigin) {
			var _currentAnimation = this._objectClass.GetAnimations()[0];
            var curAnimFrame = _currentAnimation.GetFrameAt(0);		
            var curImageInfo = curAnimFrame.GetImageInfo();
			//_currentAnimation._frames.push(new C3.AnimationFrameInfo(curImageInfo));
			var clonedFrameData=this.FrameDataFromImageInfo(curImageInfo);
			var newFrame = new C3.AnimationFrameInfo(clonedFrameData);
			_currentAnimation._frames.push(newFrame);
			
			//curAnimFrame=newFrame;
			//curImageInfo=newFrame.GetImageInfo();
            const wi = this.GetWorldInfo();
            const runtime = this._runtime;
            if (curImageInfo.GetURL() === url) {
                if (true)// resize === 0) 
				{
                    wi.SetSize(curImageInfo.GetWidth(), curImageInfo.GetHeight());
                    wi.SetBboxChanged();
                }
                this.Trigger(C3.Plugins.Spriter.Cnds.OnURLLoaded);
                return;
            }
            const imageInfo = C3.New(C3.ImageInfo);
            await imageInfo.LoadDynamicAsset(runtime, url);
            if (!imageInfo.IsLoaded()) {
                this.Trigger(C3.Plugins.Spriter.Cnds.OnURLFailed);
                return
            }
            await imageInfo.LoadStaticTexture(runtime.GetWebGLRenderer(), {
                sampling: this._runtime.GetSampling()
            });
            curImageInfo.ReplaceWith(imageInfo);
            //this._sdkType._UpdateAllCurrentTexture();
            if (!this.WasReleased())// && resize === 0) 
			{
                wi.SetSize(curImageInfo.GetWidth(), curImageInfo.GetHeight());
                wi.SetBboxChanged()
            }
            runtime.UpdateRender();
            if (!this.WasReleased())
                await this.TriggerAsync(C3.Plugins.Spriter.Cnds.OnURLLoaded)
        },

		setSecondAnim(animName)
		{
			this.A__setSecondAnim(animName);
		},
		stopSecondAnim(animName)
		{
			this.A__stopSecondAnim(animName);
		},
		setAnimBlendRatio(newBlend)
		{
			this.A__setAnimBlendRatio(newBlend);
		},
		setEnt(entName, animName)
		{
			this.A__setEnt(entName, animName);
		},

		playAnimTo(units, playTo)
		{
			this.A__playAnimTo(units, playTo);
		},
        async loadFromURL(url, crossOrigin, sconText) {
			this.ProcessRawTextFile(JSON.parse(sconText));
            var _currentAnimation = this._objectClass.GetAnimations()[0];
            var curAnimFrame = _currentAnimation.GetFrameAt(0);		
            var curImageInfo = curAnimFrame.GetImageInfo();
			//_currentAnimation._frames.push(new C3.AnimationFrameInfo(curImageInfo));
			var clonedFrameData=this.FrameDataFromImageInfo(curImageInfo);
			var newFrame = new C3.AnimationFrameInfo(clonedFrameData);
			_currentAnimation._frames.push(newFrame);
			
			//curAnimFrame=newFrame;
			//curImageInfo=newFrame.GetImageInfo();
            const wi = this.GetWorldInfo();
            const runtime = this._runtime;
            if (curImageInfo.GetURL() === url) {
                if (true) {
                    wi.SetSize(curImageInfo.GetWidth(), curImageInfo.GetHeight());
                    wi.SetBboxChanged()
                }
                // this.Trigger(C3.Plugins.Sprite.Cnds.OnURLLoaded);
                return
            }
            const imageInfo = C3.New(C3.ImageInfo);
            await imageInfo.LoadDynamicAsset(runtime, url);
            if (!imageInfo.IsLoaded()) {
                // this.Trigger(C3.Plugins.Sprite.Cnds.OnURLFailed);
                return
            }
            await imageInfo.LoadStaticTexture(runtime.GetWebGLRenderer(), {
                sampling: this._runtime.GetSampling()
            });
            curImageInfo.ReplaceWith(imageInfo);
            this._sdkType._UpdateAllCurrentTexture();
            if (!this.WasReleased() && true) {
                wi.SetSize(curImageInfo.GetWidth(), curImageInfo.GetHeight());
                wi.SetBboxChanged()
            }
            runtime.UpdateRender();
            // if (!this.WasReleased())
                // await this.TriggerAsync(C3.Plugins.Sprite.Cnds.OnURLLoaded)
        },
		associateTypeWithName(type, name)
		{
			this.A__associateTypeWithName(type, name);
		},
		setAnimationLoop(loopOn)
		{
			this.A__setAnimationLoop(loopOn);
		},
		setAnimationTime(units, time)
		{
			this.A__setAnimationTime(units, time);
		},
		pauseAnimation()
		{
			this.A__pauseAnimation();
		},

		resumeAnimation()
		{
			this.A__resumeAnimation();
		},

		removeAllCharMaps()
		{
			this.A__removeAllCharMaps();
		},

		appendCharMap(mapName)
		{
			this.A__appendCharMap(mapName);
		},
		
		removeCharMap(mapName)
		{
			this.A__removeCharMap(mapName);
		},

		overrideObjectComponent(objectName, component, newValue)
		{
			this.A__overrideObjectComponent(objectName, component, newValue);
		},

		overrideBonesWithIk(parentBoneName, childBoneName, targetX, targetY, additionalLength)
		{
			this.A__overrideBonesWithIk(parentBoneName, childBoneName, targetX, targetY, additionalLength);
		}
	};
}