"use strict";

{
	const C3 = self.C3;
	
	const tempQuad = new C3.Quad();

	function ToDegrees(angleInRadians)
	{
		return angleInRadians / 0.0174533;
	}

	function DoCmp(a, cmp, b)
	{
		switch(cmp)
		{
			case 0:
				return a == b;
				
			case 1:
				return a != b;
				
			case 2:
				return a < b;
				
			case 3:
				return a <= b;
				
			case 4:
				return a > b;
				
			case 5:
				return a >= b;
		}
	}
	
	C3.Plugins.Spriter.Instance = class SpriterInstance extends C3.SDKWorldInstanceBase
	{
		constructor(inst, properties)
		{
			super(inst);
			
			if (properties)
			{
				this.properties = properties;
			}
			
		//	this.type = type;
		//	this.runtime = type.runtime;

			this.lastData = "";
			this.progress = 0;

			this.entity = 0;
			this.entities = [];

			this.currentSpriterTime = 0;
			this.currentAdjustedTime = 0;
			this.secondTime = 0;

			this.start_time = this._runtime.GetWallTime();
			this.lastKnownTime = this.getNowTime();

			this.drawSelf = false;
			this.ignoreGlobalTimeScale = false;
			
			this.NoPremultiply = this.properties[6]==0;
			
			this.appliedCharMaps = [];
			
			this.onCreate();
		}
		
		Release()
		{
			super.Release();
		}
		
		Draw(renderer)
		{			
			if (!this.drawSelf)
			{
				return;
			}
			
			var cur_frame = this.GetObjectClass().GetAnimations()[0].GetFrames()[0];
			const imageInfo = cur_frame.GetImageInfo();
			const texture = imageInfo.GetTexture();
			//const texture = this.GetObjectClass().GetAnimations()[0].GetFrames()[0].GetImageInfo().GetTexture();
			if (!texture)
				return;			// dynamic texture load which hasn't completed yet; can't draw anything
			
					
			const wi = this.GetWorldInfo();
			if(this.NoPremultiply)
			{
				renderer.SetNoPremultiplyAlphaBlend();
			}
			else
			{
				renderer.SetBlendMode(wi.GetBlendMode());
			}
			const quad = wi.GetBoundingQuad();
			const rcTex = imageInfo.GetTexRect();

			renderer.SetTexture(texture);

			var mirror_factor = (this.xFlip == 1 ? -1 : 1);
			var flip_factor = (this.yFlip == 1 ? -1 : 1);

			var object = null;

			var uv = {};
			uv.left = 0;
			uv.top = 0;
			uv.right = 1;
			uv.bottom = 1;
			var animation = this.currentAnimation;
			if (animation)
			{
				var key = animation.mainlineKeys[animation.cur_frame];
				if (key)
				{
					var sheetTex = this.GetSdkType().sheetTex;
					sheetTex=rcTex;
					var cur_imageWidth = cur_frame._imageInfo._width;
					var cur_imageHeight = cur_frame._imageInfo._height;
					for (var i = 0; i < key.objects.length; i++)
					{
						object = key.objects[i];
						if (object.type == "reference")
						{
							var refTimeline = animation.timelines[object.timeline];
							var objState = refTimeline.currentObjectState;

							if (objState && typeof objState.frame !== 'undefined' && objState.frame > -1)
							{
								var obj = refTimeline.object;
								if (obj)
								{
									var atlasInfo = obj.imageSizes[objState.frame];
									if(typeof atlasInfo == 'undefined')
									{
										continue;
									}

									var angle = objState.angle;

									if (mirror_factor * flip_factor == -1)
									{
										angle -= this.toRadians(180);

										if (!atlasInfo.atlasRotated)
										{
											angle *= -1;
											angle = this.toRadians(180) - angle;
										}
									}

									uv.left = (atlasInfo.atlasX) / cur_imageWidth;
									uv.top = (atlasInfo.atlasY) / cur_imageHeight;

									var w = 0;
									var h = 0;

									if (atlasInfo.atlasRotated)
									{
										angle -= this.toRadians(90);
										w += atlasInfo.atlasH;
										h += atlasInfo.atlasW;
									}
									else
									{
										w += atlasInfo.atlasW;
										h += atlasInfo.atlasH;
									}

									uv.right = ((atlasInfo.atlasX) + w) / cur_imageWidth;
									uv.bottom = ((atlasInfo.atlasY) + h) / cur_imageHeight;

									if (mirror_factor == -1)
									{
										var temp = uv.left;
										uv.left = uv.right;
										uv.right = temp;
									}
									
									if (flip_factor == -1)
									{
										var temp = uv.top;
										uv.top = uv.bottom;
										uv.bottom = temp;
									}

									var bbox = new C3.Rect(0, 0, 0, 0);
									var bquad = new C3.Quad();

									var absPivotX = (objState.pivotX * atlasInfo.w) * objState.xScale;
									var xOff = objState.xScale * atlasInfo.atlasXOff;

									var absPivotY = (objState.pivotY * atlasInfo.h) * objState.yScale;
									var yOff = objState.yScale * atlasInfo.atlasYOff;

									var reverseAbsPivotX = ((1.0 - objState.pivotX) * atlasInfo.w) * objState.xScale;
									var reverseXOff = objState.xScale * (atlasInfo.w - (atlasInfo.atlasXOff + atlasInfo.atlasW));

									var reverseAbsPivotY = ((1.0 - objState.pivotY) * atlasInfo.h) * objState.yScale;
									var reverseYOff = objState.yScale * (atlasInfo.h - (atlasInfo.atlasYOff + atlasInfo.atlasH));

									var offsetX = 0;
									var offsetY = 0;

									// Get unrotated box
									if (atlasInfo.atlasRotated)
									{
										bbox.set(objState.x, objState.y, objState.x + (atlasInfo.atlasH * objState.yScale), objState.y + (atlasInfo.atlasW * objState.xScale));

										if (mirror_factor == -1)
										{
											offsetX = yOff - absPivotY;
										}
										else
										{
											offsetX = reverseYOff - reverseAbsPivotY;
										}

										if (flip_factor == -1)
										{
											offsetY = reverseXOff - reverseAbsPivotX;
										}
										else
										{
											offsetY = xOff - absPivotX;
										}
									}
									else
									{
										bbox.set(objState.x, objState.y, objState.x + (atlasInfo.atlasW * objState.xScale), objState.y + (atlasInfo.atlasH * objState.yScale));

										if (mirror_factor == -1)
										{
											offsetX = reverseXOff - reverseAbsPivotX;
										}
										else
										{
											offsetX = xOff - absPivotX;
										}

										if (flip_factor == -1)
										{
											offsetY = reverseYOff - reverseAbsPivotY;
										}
										else
										{
											offsetY = yOff - absPivotY;
										}
									}

									bbox.offset(offsetX, offsetY);

									// Rotate to a quad and store bounding quad
									bbox.offset(-objState.x, -objState.y); // translate to origin
									bquad.setFromRotatedRect(bbox, angle); // rotate around origin
									bquad.offset(objState.x, objState.y); // translate back to original position

									// Generate bounding box from rotated quad
									bquad.getBoundingBox(bbox);

									// Normalize bounding box in case of mirror/flip
									bbox.normalize();

									var q = bquad;

									renderer.SetOpacity(objState.a);

									var finalUv2 = {};
									//var finalUv =  new C3.Quad();
									// finalUv2.left = this.lerp(sheetTex._left, sheetTex._right, uv.left);
									// finalUv2.right = this.lerp(sheetTex._left, sheetTex._right, uv.right);
									// finalUv2.top = this.lerp(sheetTex._top, sheetTex._bottom, uv.top);
									// finalUv2.bottom = this.lerp(sheetTex._top, sheetTex._bottom, uv.bottom);
									finalUv2.left = this.lerp(sheetTex._left, sheetTex._right, uv.left);
									finalUv2.right = this.lerp(sheetTex._left, sheetTex._right, uv.right);
									finalUv2.top = this.lerp(sheetTex._top, sheetTex._bottom, uv.top);
									finalUv2.bottom = this.lerp(sheetTex._top, sheetTex._bottom, uv.bottom);
									var finalUv = new C3.Quad();
									finalUv.setRect(finalUv2.left,finalUv2.top,finalUv2.right,finalUv2.bottom);
									// glw.quadTex(q.tlx, q.tly, q.trx, q.try_, q.brx, q.bry, q.blx, q.bly, finalUv);
									renderer.Quad4(q,finalUv);
									//renderer.Quad3(q, new C3.Rect(0, 0,1, 1));
									//renderer.Quad4(quad,finalUv);
								}
							}
						}
					}
				}
			}
		}
		
		SaveToJson()
		{
			return {
				// data to be saved for savegames
			};
		}
		
		LoadFromJson(o)
		{
			// load state for savegames
		}
		
		
		setEntitiesToOtherEntities(otherEntities)
		{
			var NO_INDEX = -1;
			var entityTags = otherEntities;
			var att = 0;
			for (var e = 0; e < entityTags.length; e++)
			{
				var entityTag = entityTags[e];
				att = entityTag;
				var entity = new SpriterEntity();
				att = entityTag;
				entity.name = att.name;
				var animationTags = entityTag.animations;
				for (var a = 0; a < animationTags.length; a++)
				{
					var animationTag = animationTags[a];
					att = animationTag;
					var animation = new SpriterAnimation();
					animation.name = att.name;
					animation.length = att.length;
					animation.looping = att.looping;
					animation.loopTo = att.loopTo;
					animation.l = att.l;
					animation.t = att.t;
					animation.r = att.r;
					animation.b = att.b;
					animation.meta = att.meta;

					var mainlineTag = animationTag.mainlineKeys;

					var mainline = new SpriterTimeline();

					var keyTags = mainlineTag;
					for (var k = 0; k < keyTags.length; k++)
					{
						var keyTag = keyTags[k];

						var key = new SpriterKey();
						att = keyTag;
						key.time = att.time;
						key.curveType = att.curveType;
						key.c1 = att.c1;
						key.c2 = att.c2;
						key.c3 = att.c3;
						key.c4 = att.c4;
						var boneRefTags = keyTag.bones;
						if (boneRefTags)
						{
							for (var o = 0; o < boneRefTags.length; o++)
							{
								var boneRefTag = boneRefTags[o];
								att = boneRefTag;
								var boneRef = new SpriterObjectRef();
								boneRef.timeline = att.timeline;
								boneRef.key = att.key;
								boneRef.parent = att.parent;
								key.bones.push(boneRef);
							}
						}

						var objectRefTags = keyTag.objects;
						if (objectRefTags)
						{
							for (var o = 0; o < objectRefTags.length; o++)
							{
								var objectRefTag = objectRefTags[o];
								att = objectRefTag;
								var objectRef = new SpriterObjectRef();
								objectRef.timeline = att.timeline;
								objectRef.key = att.key;
								objectRef.parent = att.parent;
								key.objects.push(objectRef);
							}
						}

						animation.mainlineKeys.push(key);
					}

					animation.mainline = mainline;
					var timelineTags = animationTag.timelines;
					if (timelineTags)
					{
						for (var t = 0; t < timelineTags.length; t++)
						{
							var timelineTag = timelineTags[t];

							var timeline = new SpriterTimeline();
							timeline.objectType = timelineTag.objectType;

							var timelineName = timelineTag.name;
							timeline.name = timelineName;
							timeline.meta = timelineTag.meta;
							var keyTags = timelineTag.keys;
							if (keyTags)
							{

								for (var k = 0; k < keyTags.length; k++)
								{
									var keyTag = keyTags[k];

									var key = new SpriterKey();

									key.time = keyTag.time;
									key.spin = keyTag.spin;
									key.curveType = keyTag.curveType;
									key.c1 = keyTag.c1;
									key.c2 = keyTag.c2;
									key.c3 = keyTag.c3;
									key.c4 = keyTag.c4;
									var objectTags = keyTag.objects;
									if (objectTags)
									{
										for (var o = 0; o < objectTags.length; o++)
										{
											var objectTag = objectTags[o];
											var object = this.CloneObject(objectTag);
											key.objects.push(object);
										}
									}
									var boneTags = keyTag.bones;
									if (boneTags)
									{
										for (var o = 0; o < boneTags.length; o++)
										{
											var boneTag = boneTags[o];
											var bone = this.CloneObject(boneTag);
											key.bones.push(bone);
										}
									}
									timeline.keys.push(key);
								}
							}
							timeline.c2Object = this.c2ObjectArray[this.findObjectItemInArray(timelineName, this.objectArray, entity.name)];
							timeline.object = timelineTag.object;
							animation.timelines.push(timeline);
						}
					}

					timelineTags = animationTag.soundlines;
					if (timelineTags)
					{
						for (var t = 0; t < timelineTags.length; t++)
						{
							var timelineTag = timelineTags[t];

							var timeline = new SpriterTimeline();
							timeline.objectType = timelineTag.objectType;

							var timelineName = timelineTag.name;
							timeline.name = timelineName;
							timeline.meta = timelineTag.meta;
							var keyTags = timelineTag.keys;
							if (keyTags)
							{

								for (var k = 0; k < keyTags.length; k++)
								{
									var keyTag = keyTags[k];

									var key = new SpriterKey();
									timelineTag = keyTag;

									key.time = timelineTag.time;
									key.curveType = timelineTag.curveType;
									key.c1 = timelineTag.c1;
									key.c2 = timelineTag.c2;
									key.c3 = timelineTag.c3;
									key.c4 = timelineTag.c4;
									var objectTags = keyTag.objects;
									if (objectTags)
									{
										for (var o = 0; o < objectTags.length; o++)
										{
											var objectTag = objectTags[o];
											var object = this.cloneSound(objectTag);
											key.objects.push(object);
										}
									}
									timeline.keys.push(key);
								}
							}
							animation.soundlines.push(timeline);
						}
					}
					timelineTags = animationTag.eventlines;
					if (timelineTags)
					{
						for (var t = 0; t < timelineTags.length; t++)
						{
							var timelineTag = timelineTags[t];

							var timeline = new SpriterTimeline();
							timeline.objectType = timelineTag.objectType;

							var timelineName = timelineTag.name;
							timeline.name = timelineName;
							timeline.meta = timelineTag.meta;
							var keyTags = timelineTag.keys;
							if (keyTags)
							{

								for (var k = 0; k < keyTags.length; k++)
								{
									var keyTag = keyTags[k];

									var key = new SpriterKey();
									timelineTag = keyTag;

									key.time = timelineTag.time;
									timeline.keys.push(key);
								}
							}
							animation.eventlines.push(timeline);
						}
					}
					entity.animations.push(animation);

				}
				this.entities.push(entity);
				if (!this.entity || this.properties[1] === entity.name)
				{
					this.entity = entity;
				}
			}

		};
		forceCharacterFromPreload()
		{
			this.getCharacterFromPreload();
		}

		getCharacterFromPreload()
		{
			if (this.GetSdkType().scmlFiles.hasOwnProperty(this.properties[0]))
			{
				this.force = true;
				//if(!this.GetSdkType().scmlReserved.hasOwnProperty(this.properties[0]))
				{
					this.setEntitiesToOtherEntities(this.GetSdkType().scmlFiles[this.properties[0]]);
					if (this.GetSdkType().objectArrays.hasOwnProperty(this.properties[0]))
					{
						this.objectArray = this.GetSdkType().objectArrays[this.properties[0]];
						this.boneWidthArray = this.GetSdkType().boneWidthArrays[this.properties[0]];
					}
					this.c2ObjectArray = this.generateTestC2ObjectArray(this.objectArray);

					if (this.startingEntName)
					{
						this.setEntTo(this.startingEntName);
					}
					else
					{
				this.setEntTo(this.properties[1]);
					}

					this.associateAllTypes();
					this.initDOMtoPairedObjects();

					if (this.startingAnimName)
					{
						this.setAnimTo(this.startingAnimName);
					}
					else
					{
						this.setAnimTo(this.properties[2]);
					}

					if (!this.currentAnimation && this.entity && this.entity.animations.length && !this.changeAnimTo)
					{
						if(!this.startingAnimName)
						{
							this.setAnimTo(this.entity.animations[0].name);
						}
						else
						{
							this.setAnimTo(this.startingAnimName);
						}
					}
					if (this.startingLoopType && this.currentAnimation)
					{
						this.currentAnimation.looping = this.startingLoopType;
					}
					this.doGetFromPreload = true;
					//this.Trigger(C3.Plugins.Spriter.Cnds.readyForSetup, this);
				}
				return true;
			}
			else if (this.GetSdkType().scmlReserved.hasOwnProperty(this.properties[0]))
			{
				if (!this.GetSdkType().scmlInstsToNotify[this.properties[0]])
				{
					this.GetSdkType().scmlInstsToNotify[this.properties[0]] = [];
				}
				if(!this in this.GetSdkType().scmlInstsToNotify[this.properties[0]])
				{
					this.GetSdkType().scmlInstsToNotify[this.properties[0]].push(this);
				}
				return true;
			}
			return false;
		}

		onCreate()
		{
			this.COMPONENTANGLE = '0';
			this.COMPONENTX = '1';
			this.COMPONENTY = '2';
			this.COMPONENTSCALEX = '3';
			this.COMPONENTSCALEY = '4';
			this.COMPONENTIMAGE = '5';
			this.COMPONENTPIVOTX = '6';
			this.COMPONENTPIVOTY = '7';
			this.COMPONENTENTITY = '8';
			this.COMPONENTANIMATION = '9';
			this.COMPONENTTIMERATIO = '10';
			
			
			//this.xmlDoc = null;
			this.nodeStack = [];
			this.isDestroyed = false;
			//this.cur_frame = 0;
			this.folders = [];
			this.tagDefs = [];

			this.currentAnimation = "";
			this.secondAnimation = "";
			this.animBlend = 0.0;
			this.blendStartTime = 0.0;
			this.blendEndTime = 0.0;
			this.blendPoseTime = 0.0;

			this.lastKnownInstDataAsObj = null;
			this.lastZ = null;
			this.c2ObjectArray = [];
			this.objectArray = [];
			this.boneWidthArray = {};
			this.boneIkOverrides = {};
			this.objectOverrides = {};
			this.objInfoVarDefs = [];
			this.animPlaying = true;
			this.speedRatio = 1.0;

			this.setLayersForSprites = true;
			this.setVisibilityForObjects = true;
			this.setCollisionsForObjects = true;

			this.scaleRatio = this.GetWorldInfo().GetWidth() / 50.0;
			this.subEntScaleX = 1.0;
			this.subEntScaleY = 1.0;
			this.xFlip = false;
			this.yFlip = false;
			this.playTo = -1;
			this.changeToStartFrom = 0;
			this._StartTicking();

			this._StartTicking2();
			//this.runtime.tickMe(this);
			//this.runtime.tick2Me(this);
			this.startingEntName = null;
			this.startingAnimName = null;
			this.startingLoopType = null;

			this.leftBuffer = 0;
			this.rightBuffer = 0;
			this.topBuffer = 0;
			this.bottomBuffer = 0;
			

			this.PAUSENEVER = 0;
			this.PAUSEALLOUTSIDEBUFFER = 1;
			this.PAUSEALLBUTSOUNDOUTSIDEBUFFER = 2;
			this.pauseWhenOutsideBuffer = this.PAUSENEVER;
			this.loadingScon = false;
			
			
			this.PLAYFROMSTART = 0;
			this.PLAYFROMCURRENTTIME = 1;
			this.PLAYFROMCURRENTTIMERATIO = 2;
			this.BLENDTOSTART = 3;
			this.BLENDATCURRENTTIMERATIO = 4;

			this.soundToTrigger = "";
			this.soundLineToTrigger = {};
			this.eventToTrigger = "";
			this.eventLineToTrigger = {};

			this.lastFoundObject = "";

			this.objectsToSet = [];

			this.drawSelf = this.properties[4] == 1;

			this.properties[0] = this.properties[0].toLowerCase();
			if (this.properties[0].lastIndexOf(".scml") > -1)
			{
				this.properties[0] = this.properties[0].replace(".scml", ".scon");
			}
			// if ((!this.getCharacterFromPreload()) && this.properties[0].length > 0)
			// {
				// this.LoadScon();
			// }

			this.force = false;
			this.inAnimTrigger = false;
			this.changeAnimTo = null;
			this.GetWorldInfo().SetOpacity(this.clamp(0.0, 1.0, this.properties[3] / 100.0));
		};

		async LoadScon()
		{
			if(!this.loadingScon)
			{
				this.loadingScon = true;
				var assetManager = this.GetRuntime().GetAssetManager();
				var url = await	assetManager.GetProjectFileUrl(this.properties[0]);
				var json = await assetManager.FetchJson(url);
				this.ProcessRawTextFile(json);
				
				if(this.GetSdkType())
				{
					this.GetSdkType().scmlFiles[this.properties[0]] = this.entities;
					this.GetSdkType().scmlReserved[this.properties[0]] = this;
				}
				this.loadingScon = false;
			}
		}
		
		ProcessRawTextFile(text)
		{
			//text.replace(/\r\n/g, "\n"); // fix windows style line endings
			this.doRequest(text);
			if (this.startingEntName)
			{
				this.setEntTo(this.startingEntName);
			}

			if (this.startingAnimName)
			{
				this.setAnimTo(this.startingAnimName);
			}
			if (this.startingLoopType && this.currentAnimation)
			{
				this.currentAnimation.looping = this.startingLoopType;
			}
		}
		
		onDestroy()
		{
			this.isDestroyed = true;
		};

		getVarDefsByName(objName)
		{
			for (var o = 0; o < this.objInfoVarDefs.length; o++)
			{
				var objInf = this.objInfoVarDefs[o];
				if (objInf)
				{
					if (objInf.name === objName)
					{
						return objInf.varDefs;
					}
				}
			}
		}
		getVarDefByName(objName, varName)
		{
			var objInf = this.getVarDefsByName(objName);
			if (objInf)
			{
				for (var v = 0; v < objInf.varDefs.length; v++)
				{
					var varDef = objInf.varDefs[v];
					if (varDef)
					{
						if (varDef.name == varName)
						{
							return varDef;
						}
					}
				}
			}
		}

		

		C2ObjectToSpriterObjectInstruction(initialC2Object, spriterObjectName, propertiesToSet, pin)
		{
			var newInstruction={};
			newInstruction.c2Object = Array.from(initialC2Object);
			newInstruction.objectName = spriterObjectName;
			newInstruction.setType = propertiesToSet;
			// 0 = angle and position
			// 1 = angle
			// 2 = position
			newInstruction.pin = pin;
			return newInstruction;
		}

		clamp(low, high, val)
		{
			if (val > high)
			{
				return high;
			}
			if (val < low)
			{
				return low;
			}
			return val;
		}

		setTimeInfoFromJson(json, targetKey)
		{
			if (json.hasOwnProperty("time") && targetKey.time !== undefined)
			{
				targetKey.time = json["time"];
			}
			if (json.hasOwnProperty("spin") && targetKey.spin !== undefined)
			{
				targetKey.spin = (json["spin"]);
			}
			if (json.hasOwnProperty("curve_type") && targetKey.curveType !== undefined)
			{
				targetKey.curveType = json["curve_type"];
			}
			if (json.hasOwnProperty("c1") && targetKey.c1 !== undefined)
			{
				targetKey.c1 = json["c1"];
			}
			if (json.hasOwnProperty("c2") && targetKey.c2 !== undefined)
			{
				targetKey.c2 = json["c2"];
			}
			if (json.hasOwnProperty("c3") && targetKey.c3 !== undefined)
			{
				targetKey.c3 = json["c3"];
			}
			if (json.hasOwnProperty("c4") && targetKey.c4 !== undefined)
			{
				targetKey.c4 = json["c4"];
			}
		}
		
		setTimelinesFromJson(json, timelines, entity)
		{
			if (json)
			{
				for (var t = 0; t < json.length; t++)
				{
					var timelineTag = json[t];

					var timeline = new SpriterTimeline();

					if (timelineTag.hasOwnProperty("object_type"))
					{
						timeline.objectType = timelineTag["object_type"];
					}

					var timelineName = timelineTag["name"];
					timeline.name = timelineName;

					var keyTags = timelineTag["key"];
					if (keyTags)
					{
						for (var k = 0; k < keyTags.length; k++)
						{
							var keyTag = keyTags[k];

							var key = new SpriterKey();

							this.setTimeInfoFromJson(keyTag, key);
							
							var objectTags = keyTag["object"];
							if (objectTags)
							{
								
								var objectTag = objectTags;
								var object = this.objectFromTag(objectTag, this.objectArray, timelineName, timeline.objectType, entity.name);
								key.objects.push(object);
							}
							var boneTags = keyTag["bone"];
							if (boneTags)
							{
								
								var boneTag = boneTags;
								var bone = this.objectFromTag(boneTag, this.objectArray, timelineName, timeline.objectType, entity.name);
								key.bones.push(bone);
							}
							
							timeline.keys.push(key);
						}
					}
					timeline.c2Object = this.c2ObjectArray[this.findObjectItemInArray(timelineName, this.objectArray, entity.name)];

					var obj = this.objectFromArray(timelineName, this.objectArray, entity.name);
					var defs = {};
					if (obj)
					{
						defs = obj.varDefs;
					}
					timeline.object = obj;
					this.setMetaDataFromJson(timelineTag["meta"], timeline.meta, defs);
					timelines.push(timeline);
				}
			}
		}
		
		setSoundlinesFromJson(json, timelines, entityname)
		{
			if (json)
			{
				for (var t = 0; t < json.length; t++)
				{
					var timelineTag = json[t];

					var timeline = new SpriterTimeline();

					timeline.objectType = "sound";

					var timelineName = timelineTag["name"];
					timeline.name = timelineName;

					var keyTags = timelineTag["key"];
					if (keyTags)
					{

						for (var k = 0; k < keyTags.length; k++)
						{
							var keyTag = keyTags[k];

							var key = new SpriterKey();

							this.setTimeInfoFromJson(keyTag, key);
							var soundTags = keyTag["object"];
							if (soundTags)
							{
								var soundTag = soundTags;
								var sound = this.soundFromTag(soundTag);
								key.objects.push(sound);
							}
							timeline.keys.push(key);
						}
					}
					var obj = this.objectFromArray(timeline.name, this.objectArray, entityname);

					this.setMetaDataFromJson(timelineTag["meta"], timeline.meta, this.getVarDefsByName(timeline.name));
					timelines.push(timeline);
				}
			}
		}
		
		setVarlinesFromJson(json, timelines, vardefs)
		{
			if (json)
			{
				for (var t = 0; t < json.length; t++)
				{
					var timelineTag = json[t];

					var timeline = new VarLine();
					timeline.defIndex = timelineTag["def"];
					timeline.def = vardefs[timeline.defIndex];
					var keyTags = timelineTag["key"];
					if (keyTags)
					{
						for (var k = 0; k < keyTags.length; k++)
						{
							var keyTag = keyTags[k];

							var key = new VarKey();
							this.setTimeInfoFromJson(keyTag, key);
							key.val = keyTag["val"];
							timeline.keys.push(key);
						}
					}
					timelines.push(timeline);
				}
			}
		}
		
		setEventlinesFromJson(json, timelines, entityname)
		{
			if (json)
			{
				for (var t = 0; t < json.length; t++)
				{
					var timelineTag = json[t];

					var timeline = new EventLine();
					timeline.name = timelineTag["name"];

					var keyTags = timelineTag["key"];
					if (keyTags)
					{
						for (var k = 0; k < keyTags.length; k++)
						{
							var keyTag = keyTags[k];

							var key = new EventKey();
							this.setTimeInfoFromJson(keyTag, key);
							timeline.keys.push(key);
						}
					}
					this.setMetaDataFromJson(timelineTag["meta"], timeline.meta, this.getVarDefsByName(timeline.name));

					timelines.push(timeline);
				}
			}
		}
		
		setTaglinesFromJson(json, timeline)
		{
			if (json)
			{
				var keyTags = json["key"];
				if (keyTags)
				{
					for (var k = 0; k < keyTags.length; k++)
					{
						var keyTag = keyTags[k];

						var key = new TagKey();
						this.setTimeInfoFromJson(keyTag, key);
						var tagTags = keyTag["tag"];
						var tags = key.tags;
						if (tagTags)
						{
							for (var ta = 0; ta < tagTags.length; ta++)
							{
								var tagTag = tagTags[ta];
								if (tagTag)
								{
									tags.push(this.tagDefs[tagTag["t"]]);
								}
							}
						}
						timeline.keys.push(key);
					}
				}
			}
		}
		
		setMetaDataFromJson(json, meta, vardefs)
		{
			if (json)
			{
				var innerTag = json["tagline"];
				
				if (innerTag)
				{
					this.setTaglinesFromJson(innerTag, meta.tagline);
				}
				innerTag = json["valline"];
				
				if (innerTag)
				{
					this.setVarlinesFromJson(innerTag, meta.varlines, vardefs);
				}
			}
		}		

		CloneObject(other)
		{
			if (other)
			{
				var newObj = new SpriterObject();
				newObj.type = other.type;
				newObj.x = other.x;
				newObj.y = other.y;
				newObj.angle = other.angle;
				newObj.a = other.a;
				newObj.xScale = other.xScale;
				newObj.yScale = other.yScale;
				newObj.pivotX = other.pivotX;
				newObj.pivotY = other.pivotY;
				newObj.entity = other.entity;
				newObj.animation = other.animation;
				newObj.t = other.t;
				newObj.defaultPivot = other.defaultPivot;
				newObj.frame = other.frame;
				newObj.storedFrame = newObj.storedFrame;
				return newObj;
			}
			else
			{
				return null;
			}
		}

		sampleCurve(a, b, c, t)
		{
			return ((a * t + b) * t + c) * t;
		}

		sampleCurveDerivativeX(ax, bx, cx, t)
		{
			return (3.0 * ax * t + 2.0 * bx) * t + cx;
		}
		
		// The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
		// animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
		solveEpsilon(duration)
		{
			return 1.0 / (200.0 * duration);
		}

		solve(ax, bx, cx, ay, by, cy, x, epsilon)
		{
			return this.sampleCurve(ay, by, cy, this.solveCurveX(ax, bx, cx, x, epsilon));
		}
				
		// Given an x value, find a parametric value it came from.
		fabs(n)
		{
			if (n >= 0)
			{
				return n;
			}
			else
			{
				return 0 - n;
			}
		}

		solveCurveX(ax, bx, cx, x, epsilon)
		{
			var t0;
			var t1;
			var t2;
			var x2;
			var d2;
			var i;

			// First try a few iterations of Newton's method -- normally very fast.
			for (t2 = x, i = 0; i < 8; i++)
			{
				x2 = this.sampleCurve(ax, bx, cx, t2) - x;
				if (this.fabs(x2) < epsilon)
				{
					return t2;
				}
				d2 = this.sampleCurveDerivativeX(ax, bx, cx, t2);
				if (this.fabs(d2) < 1e-6)
				{
					break;
				}
				t2 = t2 - x2 / d2;
			}
			// Fall back to the bisection method for reliability.
			t0 = 0.0;
			t1 = 1.0;
			t2 = x;
			if (t2 < t0)
			{
				return t0;
			}
			if (t2 > t1)
			{
				return t1;
			}
			while (t0 < t1)
			{
				x2 = this.sampleCurve(ax, bx, cx, t2);
				if (this.fabs(x2 - x) < epsilon)
				{
					return t2;
				}
				if (x > x2)
				{
					t0 = t2;
				}
				else
				{
					t1 = t2;
				}
				t2 = (t1 - t0) * .5 + t0;
			}
			return t2; // Failure.
		}

		// currently used function to determine time
		// 1:1 conversion to js from webkit source files
		// UnitBezier.h, WebCore_animation_AnimationBase.cpp
		CubicBezierAtTime(t, p1x, p1y, p2x, p2y, duration)
		{
			var ax = 0;
			var bx = 0;
			var cx = 0;
			var ay = 0;
			var by = 0;
			var cy = 0;
			// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.


			// Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
			cx = 3.0 * p1x;
			bx = 3.0 * (p2x - p1x) - cx;
			ax = 1.0 - cx - bx;
			cy = 3.0 * p1y;
			by = 3.0 * (p2y - p1y) - cy;
			ay = 1.0 - cy - by;
			// Convert from input time to parametric value in curve, then from that to output time.
			return this.solve(ax, bx, cx, ay, by, cy, t, this.solveEpsilon(duration));
		}

		getT(a, b, x)
		{
			if (a === b)
			{
				return 0;
			}
			//else
			return (x - a) / (b - a);
		}

		qerp(a, b, c, t)
		{
			return this.lerp(this.lerp(a, b, t), this.lerp(b, c, t), t);
		}

		cerp(a, b, c, d, t)
		{
			return this.lerp(this.qerp(a, b, c, t), this.qerp(b, c, d, t), t);
		}

		quartic(a, b, c, d, e, t)
		{
			return this.lerp(this.cerp(a, b, c, d, t), this.cerp(b, c, d, e, t), t);
		}

		quintic(a, b, c, d, e, f, t)
		{
			return this.lerp(this.quartic(a, b, c, d, e, t), this.quartic(b, c, d, e, f, t), t);
		}

		trueT(key, t)
		{
			switch (key.curveType)
			{
				case "linear":
					return t;
				case "quadratic":
					return this.qerp(0, key.c1, 1, t);
				case "cubic":
					return this.cerp(0, key.c1, key.c2, 1, t);
				case "quartic":
					return this.quartic(0, key.c1, key.c2, key.c3, 1, t);
				case "quintic":
					return this.quintic(0, key.c1, key.c2, key.c3, key.c4, 1, t);
				case "bezier":
					return this.CubicBezierAtTime(t, key.c1, key.c2, key.c3, key.c4, 1.0);
					//return quintic(0,c.value(0,0),c.value(1,0),c.value(2,0),c.value(3,0),1,t);
				case "instant":
					if (t >= 1)
					{
						return 1;
					}
					else
					{
						return 0;
					}
			}
			//case CURVETYPE_INSTANT or invalid thing;
			return 0;
		}

		TweenedSpriterObject(a, b, t, spin, wFactor, hFactor)
		{
			wFactor = typeof wFactor !== 'undefined' ? wFactor : 1;
			hFactor = typeof hFactor !== 'undefined' ? hFactor : 1;
			var newObj = new SpriterObject();
			newObj.type = a.type;
			newObj.x = this.lerp(a.x, b.x, t);
			newObj.y = this.lerp(a.y, b.y, t);
			newObj.angle = this.anglelerp2(a.angle, b.angle, t, spin);
			newObj.a = this.lerp(a.a, b.a, t);
			newObj.xScale = this.lerp(a.xScale, b.xScale, t);
			newObj.yScale = this.lerp(a.yScale, b.yScale, t);
			newObj.pivotX = a.pivotX; //this.lerp(a.pivotX,b.pivotX,t);
			newObj.pivotY = a.pivotY; //this.lerp(a.pivotY,b.pivotY,t);
			newObj.defaultPivot = a.defaultPivot;
			newObj.frame = a.frame;
			newObj.entity = a.entity;
			newObj.animation = a.animation;
			newObj.t = this.lerp(a.t, b.t, t);
			newObj.storedFrame = a.storedFrame;
			return newObj;
		}

		TweenedSpriterSound(a, b, t)
		{
			var newSound = new SpriterSound();
			newSound.trigger = a.trigger;
			newSound.volume = this.lerp(a.volume, b.volume, t);
			newSound.panning = this.lerp(a.panning, b.panning, t);
			newSound.name = a.name;
			return newSound;
		}

		

		SetSpriteAnimFrame(sprite, framenumber, c2Object)
		{
			if (c2Object && c2Object.appliedMap[framenumber] !== undefined)
			{
				if (c2Object.appliedMap[framenumber] === -1)
				{
					if (sprite)
					{
						sprite.GetWorldInfo().SetVisible(false);
					}
					framenumber = -1;
				}
				else
				{
					framenumber = c2Object.appliedMap[framenumber];
				}
			}
			if (sprite && sprite.GetSdkInstance()._GetAnimFrame() != framenumber && framenumber != -1)
			{
				sprite.GetSdkInstance()._changeAnimFrameIndex = framenumber;

				// start ticking if not already
				 if (!sprite.GetSdkInstance().IsTicking())
				 {
					 sprite.GetSdkInstance()._StartTicking();
				 }

				// not in trigger: apply immediately 
				 if (!sprite.GetSdkInstance()._isInAnimTrigger)
				 {
					 sprite.GetSdkInstance()._DoChangeAnimFrame();
				 }
			}

			return framenumber;
		}

		anglelerp2(a, b, x, spin)
		{
			//a = this.toRadians(a);
			//b = this.toRadians(b);
			if (spin === 0)
			{
				return a;
			}
			var diff = this.angleDiff(a, b);

			// b clockwise from a
			if (spin == -1)
			{
				return (a + diff * x);
			}
			// b anticlockwise from a
			else
			{
				return (a - diff * x);
			}
		}

		findInArray(item, arr)
		{
			for (var i = 0; i < arr.length; i++)
			{
				if (arr[i] == item)
				{
					return i;
				}
			}
			return -1;
		}
		
		isOutsideViewportBox()
		{
			var worldInfo = this.GetWorldInfo();
			var viewport = worldInfo.GetLayer().GetViewport();
			if (viewport)
			{
				var x = worldInfo.GetX();
				if (x < viewport.getLeft() - this.leftBuffer)
				{
					return true;
				}
				if (x > viewport.getRight() + this.rightBuffer)
				{
					return true;
				}
				var y = worldInfo.GetY();
				if (y < viewport.getTop() - this.topBuffer)
				{
					return true;
				}
				if (y > viewport.getBottom() + this.bottomBuffer)
				{
					return true;
				}
			}
			return false;
		}
		
		MoveToLayer(inst, layerMove)
		{
			// no layer or same layer: don't do anything
			if (!layerMove || layerMove == inst.layer)
			{
				return;
			}

			// otherwise remove from current layer...			
			//inst.GetWorldInfo().GetLayer()._GetInstances().splice(inst.GetWorldInfo().GetZIndex());
			
			// TODO:
			//inst.layer.setZIndicesStaleFrom(0);

			// ...and add to the top of the new layer (which can be done without making zindices stale)
			inst.layer = layerMove;
			inst.GetWorldInfo()._SetLayer(layerMove);

			inst.GetWorldInfo()._SetZIndex(layerMove._GetInstances().length);
			//layerMove._GetInstances().push(inst);
			//TODO: inst.runtime.redraw = true;
		};

		animationFinish(reverse)
		{
			this.animTriggerName = this.currentAnimation.name;
			var animTrigger = this.inAnimTrigger;
			if (this.inAnimTrigger === false)
			{
				this.inAnimTrigger = true;
				this.Trigger(C3.Plugins.Spriter.Cnds.OnAnyAnimFinished, this);
				this.Trigger(C3.Plugins.Spriter.Cnds.OnAnimFinished, this);
				this.inAnimTrigger = false;
			}
		};

		clearAnimationState()
		{
			var anim = this.currentAnimation;
			if (anim)
			{
				for (var t = 0; t < anim.timelines.length; t++)
				{
					anim.timelines[t].currentObjectState = {};
				}
			}
		}

		getNowTime()
		{
			return (this._runtime.GetWallTime() - this.start_time);
		};

		doAnimChange()
		{
			if (this.currentAnimation)
			{
				var ratio = this.currentSpriterTime / this.currentAnimation.length;
			}
			var startFrom = this.changeToStartFrom;

			// startFrom
			// 0 play from start
			// 1 play from current time
			// 2 play from current time ratio
			// 3 blend to start
			// 4 blend at current time ratio

			if (startFrom < 3)
			{
				this.currentAnimation = this.changeAnimTo;
				this.changeAnimTo = null;
				if (startFrom === 0) //play from start
				{
					if (this.speedRatio > 0)
					{
						this.currentSpriterTime = 0;
					}
					else
					{
						this.currentSpriterTime = this.currentAnimation.length;
					}
					this.lastKnownTime = this.getNowTime();
				}
				else if (startFrom == 2) //play from current time ratio
				{
					this.currentSpriterTime = this.currentAnimation.length * ratio;
					this.lastKnownTime = this.getNowTime();
				}
				
				this.GetWorldInfo().SetWidth((this.currentAnimation.r - this.currentAnimation.l) * this.scaleRatio);
				this.GetWorldInfo().SetHeight((this.currentAnimation.b - this.currentAnimation.t) * this.scaleRatio);
				this.GetWorldInfo().SetOriginX(-(this.xFlip ? (-this.currentAnimation.r) : this.currentAnimation.l) / this.GetWorldInfo().GetWidth() * this.scaleRatio);
				this.GetWorldInfo().SetOriginY(-(this.yFlip ? (-this.currentAnimation.b) : this.currentAnimation.t) / this.GetWorldInfo().GetHeight() * this.scaleRatio);
				
				this.GetWorldInfo().SetBboxChanged();

				this.currentAdjustedTime = this.currentSpriterTime;
				this.resetEventChecksToCurrentTime();
			}
		};
		
		endBlendAndSwap()
		{
			if (this.secondAnimation)
			{
				this.blendEndTime = 0;
				this.blendStartTime = 0;
				this.animBlend = 0;
				this.blendPoseTime = 0;
				if (this.changeToStartFrom === this.BLENDTOSTART)
				{
					this.currentSpriterTime = 0;
				}
				this.currentSpriterTime = this.secondAnimation.localTime; //this.lerp(0,this.secondAnimation.length,this.getT(0,this.currentAnimation.length,this.currentSpriterTime));
				this.changeAnimTo = null;
				this.currentAnimation = this.secondAnimation;
				this.secondAnimation = null;
				// startFrom
				// 0 play from start
				// 1 play from current time
				// 2 play from current time ratio
				// 3 blend to start
				// 4 blend at current time ratio
				this.changeToStartFrom = 1; //play from current time
				//this.doAnimChange();


			}
		};
		
		tickCurrentAnimationTime()
		{
			var lastKnownTime = this.lastKnownTime;
			var nowTime = this.getNowTime();
			this.lastKnownTime = nowTime;
			var lastSpriterTime = this.currentSpriterTime;
			var cur_timescale = this.ignoreGlobalTimeScale ? 1 : this.GetRuntime().GetTimeScale();
			var animation = this.currentAnimation;

			// Apply object's own time scale if any
			
			if (this.GetInstance().GetTimeScale() !== -1.0)
			{
				cur_timescale = this.GetInstance().GetTimeScale();
			}
			if (this.animPlaying)
			{
				this.currentSpriterTime += (this.getNowTime() - lastKnownTime) * 1000 * this.speedRatio * cur_timescale;
			}

			var playTo = this.playTo;
			var animFinished = false;
			if (playTo >= 0)
			{
				if (this.animPlaying)
				{
					if (((lastSpriterTime - playTo) * (this.currentSpriterTime - playTo)) < 0)
					{
						this.animPlaying = false;
						this.currentSpriterTime = this.playTo;
						this.playTo = -1;
						animFinished = true;

					}
				}
			}
			else
			{
				if (this.speedRatio >= 0)
				{
					if (this.currentSpriterTime >= animation.length)
					{
						if (this.changeToStartFrom === this.BLENDTOSTART && this.secondAnimation && this.blendEndTime > 0)
						{
							//this.endBlendAndSwap();
						}
						else
						{
							if (animation.looping == "false")
							{
								this.currentSpriterTime = animation.length;
								this.animPlaying = false;
							}
							animFinished = true;
						}
					}
				}
				else
				{
					if (this.speedRatio < 0)
					{
						if (this.currentSpriterTime < 0)
						{
							if (this.changeToStartFrom === this.BLENDTOSTART && this.secondAnimation && this.blendEndTime > 0)
							{
								// this.endBlendAndSwap();
							}
							else
							{
								if (animation.looping == "false")
								{
									this.currentSpriterTime = 0;
									this.animPlaying = false;
								}
								animFinished = true;
							}
						}
					}
				}
			}
			
			animation = this.currentAnimation;
			while (this.currentSpriterTime < 0)
			{
				this.currentSpriterTime += animation.length;
			}

			if (this.currentSpriterTime !== animation.length)
			{
				this.currentSpriterTime %= animation.length;
			}

			if (this.secondAnimation)
			{
				if (this.changeToStartFrom === this.BLENDTOSTART)
				{
					this.secondAnimation.localTime = 0;
				}
				else
				{
					this.secondAnimation.localTime = this.lerp(0, this.secondAnimation.length, this.getT(0, this.currentAnimation.length, this.currentSpriterTime));
				}
			}
			var blendEndTime = this.blendEndTime;
			if (blendEndTime > 0)
			{
				if (blendEndTime <= nowTime)
				{
					this.endBlendAndSwap();
				}
				else
				{
					this.animBlend = this.getT(this.blendStartTime, blendEndTime, this.lastKnownTime);
				}
			}
			return animFinished;
		};

		setMainlineKeyByTime(animation)
		{
			animation = (typeof animation !== 'undefined') ? animation : this.currentAnimation;
			//var animation=this.currentAnimation;
			if (animation)
			{
				var currentTime = 0;
				if (animation === this.currentAnimation)
				{
					if (this.changeToStartFrom === this.BLENDTOSTART)
					{
						currentTime = this.blendPoseTime;
					}
					else
					{
						currentTime = this.currentSpriterTime;
					}

				}
				else
				{
					currentTime = animation.localTime;
				}
				var mainKeys = animation.mainlineKeys;
				animation.cur_frame = mainKeys.length;
				var secondTime = animation.length;
				for (var k = 1; k < mainKeys.length; k++)
				{
					if (currentTime < mainKeys[k].time)
					{
						secondTime = mainKeys[k].time;
						animation.cur_frame = k - 1;
						break;
					}
				}
				var firstTime = 0;
				if (animation === this.currentAnimation)
				{
					this.currentAdjustedTime = currentTime;
				}
				// Don't go out of bounds
				if (animation.cur_frame < 0)
				{
					animation.cur_frame = 0;
				}
				else if (animation.cur_frame >= animation.mainlineKeys.length)
				{
					animation.cur_frame = animation.mainlineKeys.length - 1;
				}
				var mainKey = mainKeys[animation.cur_frame];
				if (mainKey)
				{
					firstTime = mainKey.time;

					if (animation === this.currentAnimation)
					{
						var t = this.getT(firstTime, secondTime, this.currentSpriterTime);
						this.currentAdjustedTime = this.lerp(firstTime, secondTime, this.trueT(mainKey, t));
					}
					else
					{
						var t = this.getT(firstTime, secondTime, animation.localTime);
						if (this.changeToStartFrom === this.BLENDTOSTART)
						{
							animation.localTime = 0;
						}
						else
						{
							animation.localTime = this.lerp(firstTime, secondTime, this.trueT(mainKey, t));
						}
					}
				}

			}
		};
		
		doSecondAnimation()
		{
			return this.animBlend !== 0 && this.secondAnimation;
		}

		shortestSpin(a, b)
		{
			if (a === b)
				return 0;

			var pi = 3.141592653589793;
			var rad = pi * 2;
			while (b - a < -pi)
			{
				a -= rad;
			}
			while (b - a > pi)
			{
				b -= rad;
			}
			//while(b-a<-180)
			//{
			//	a-=360;
			//}
			//while(b-a>180)
			//{
			//	b-=360;
			//}
			//if true it's clockwise
			return b > a ? -1 : 1;
		}
		
		tweenBone(bone, tweenedBones, animation, bones, currentIndex, currentTime, nextTime, key, andPerformOverrides = true)
		{
			var nextBone = null;
			var nextFrame = null;
			var timelineIndex;
			var parent = bone.parent;
			if (bone.type == "reference")
			{

				var refTimeline = animation.timelines[bone.timeline];
				var timelineName = refTimeline.name;
				timelineIndex = bone.timeline;
				var refKey = refTimeline.keys[bone.key];
				var refKeyIndex = bone.key;
				lastTime = refKey.time;
				var nextFrame = null;
				var keysLength = refTimeline.keys.length;
				bone = refKey.bones[0];

				if (keysLength > 1)
				{
					if (refKeyIndex + 1 >= keysLength && animation.looping == "true")
					{
						nextFrame = refTimeline.keys[0];
						nextTime = nextFrame.time;
						if (currentTime > lastTime)
						{
							nextTime += animation.length;
						}
						nextBone = nextFrame.bones[0];
					}
					else if (refKeyIndex + 1 < keysLength)
					{
						nextFrame = refTimeline.keys[refKeyIndex + 1];
						nextTime = nextFrame.time;
						nextBone = nextFrame.bones[0];
					}
				}
				var mirror_factor = (this.xFlip == 1 ? -1 : 1);
				var flip_factor = (this.yFlip == 1 ? -1 : 1);
				var flipMe = 1;
				var parentBone = "";
				if (nextBone && refKey.curveType !== "instant")
				{
					var lastTime = refKey.time;
					var t = 0;
					if (currentTime < lastTime)
					{
						lastTime -= animation.length;
					}
					if (nextTime > lastTime)
					{
						t = (currentTime - lastTime) / (nextTime - lastTime);
					}
					t = this.trueT(refKey, t);

					tweenedBones[currentIndex] = this.TweenedSpriterObject(bone, nextBone, t, refKey.spin);
				}
				else
				{
					tweenedBones[currentIndex] = this.CloneObject(bone);
				}
				refTimeline.currentMappedState = this.CloneObject(tweenedBones[currentIndex]);

				if (animation === this.currentAnimation)
				{
					if (this.animBlend !== 0 && this.secondAnimation)
					{
						var secondTimeline = this.timelineFromName(refTimeline.name, this.secondAnimation);
						if (secondTimeline)
						{
							var secondBone = secondTimeline.currentObjectState;
							if (secondBone)
							{
								var firstBone = tweenedBones[currentIndex];
								tweenedBones[currentIndex] = this.TweenedSpriterObject(firstBone, secondBone, this.animBlend, this.shortestSpin(firstBone.angle, secondBone.angle));
							}
						}
					}
				}

				if (parent > -1)
				{
					if (animation === this.currentAnimation)
					{
						flipMe = tweenedBones[parent].xScale * tweenedBones[parent].yScale;
					}
					parentBone = tweenedBones[parent];
				}
				else
				{
					if (animation === this.currentAnimation)
					{
						tweenedBones[currentIndex].x *= mirror_factor * this.scaleRatio;
						tweenedBones[currentIndex].y *= flip_factor * this.scaleRatio;

						tweenedBones[currentIndex].xScale *= mirror_factor * this.scaleRatio;
						tweenedBones[currentIndex].yScale *= flip_factor * this.scaleRatio;
						parentBone = this.objFromInst(this);
						parentBone.xScale *= this.subEntScaleX;
						parentBone.yScale *= this.subEntScaleY;
						flipMe = mirror_factor * flip_factor;
					}

				}

				if (animation === this.currentAnimation)
				{
					tweenedBones[currentIndex] = this.mapObjToObj(parentBone, tweenedBones[currentIndex], flipMe);
				}

				if(andPerformOverrides)
				{
					var overrideComponents = this.objectOverrides[timelineName];
					if (typeof overrideComponents !== "undefined")
					{
						for (var component in overrideComponents)
						{
							switch (component)
							{
								case this.COMPONENTANGLE:
									tweenedBones[currentIndex].angle = this.toRadians(overrideComponents[component]);
									this.force = true;
									break;
								case this.COMPONENTX:
									tweenedBones[currentIndex].x = overrideComponents[component];
									this.force = true;
									break;
								case this.COMPONENTY:
									tweenedBones[currentIndex].y = overrideComponents[component];
									this.force = true;
									break;
								case this.COMPONENTSCALEX:
									tweenedBones[currentIndex].xScale = overrideComponents[component];
									this.force = true;
									break;
								case this.COMPONENTSCALEY:
									tweenedBones[currentIndex].yScale = overrideComponents[component];
									this.force = true;
									break;
								default:
									break;
							}
						}
						// delete this.objectOverrides[timelineName];
					}
					var ikOverride = this.boneIkOverrides[timelineName];
					if (typeof ikOverride !== "undefined")
					{
						var tweenedChildBone = {};
						var childRefTimeline = {};
						var childTimelineName = "";
						for (var i = currentIndex + 1; i < key.bones.length; i++)
						{
							var childBone = key.bones[i];
							childRefTimeline = animation.timelines[childBone.timeline];
							childTimelineName = childRefTimeline.name;
							if (childTimelineName === ikOverride.childBone)
							{
								this.tweenBone(childBone, tweenedBones, animation, bones, i, currentTime, nextTime, key, true);
								tweenedChildBone = tweenedBones[i];
								this.force = true;
								break;
							}
						}
						childRefTimeline.currentObjectState = this.applyIk(ikOverride.targetX, ikOverride.targetY, ikOverride.additionalLength, tweenedBones[currentIndex],
							childRefTimeline.currentObjectState, childRefTimeline.currentMappedState, this.boneWidthArray[childTimelineName], currentTime, nextTime, key);
						tweenedBones[i] = childRefTimeline.currentObjectState;
						// delete this.boneIkOverrides[timelineName];
					}
				}
				refTimeline.currentObjectState = this.CloneObject(tweenedBones[currentIndex]);
			}
		}
		
		currentTweenedBones(animation, andPerformOverrides = true)
		{
			var tweenedBones = [];
			animation = (typeof animation !== 'undefined') ? animation : this.currentAnimation;
			//var animation=this.currentAnimation;
			var key = animation.mainlineKeys[animation.cur_frame];
			var nextTime = 0;
			var currentTime = 0;
			this.clearAnimationState();
			if (animation === this.currentAnimation)
			{
				if (this.changeToStartFrom === this.BLENDTOSTART)
				{
					currentTime = this.blendPoseTime;
				}
				else
				{
					currentTime = this.currentAdjustedTime;
				}
			}
			else
			{
				currentTime = animation.localTime;
			}
			for (var i = 0; i < key.bones.length; i++)
			{
				var bone = key.bones[i];
				if (!tweenedBones[i])
				{
					this.tweenBone(bone, tweenedBones, animation, key.bones, i, currentTime, nextTime, key, andPerformOverrides);
				}
			}
			return tweenedBones;
		};
		
		Tick()
		{
			if (this.doGetFromPreload)
			{
				this.Trigger(C3.Plugins.Spriter.Cnds.readyForSetup, this);
				this.doGetFromPreload = false;
			}
			this.objectOverrides = {};
			this.boneIkOverrides = {};
		}
		
		CheckForUnneededBlend()
		{
			if (this.secondAnimation === this.currentAnimation && this.currentAnimation)
			{
				this.blendStartTime = 0;
				this.blendEndTime = 0;
				this.blendPoseTime = 0;
				this.secondAnimation = null;
				this.changeAnimTo = 0;
				if (this.changeToStartFrom === this.BLENDTOSTART)
				{	
					this.changeToStartFrom = this.PLAYFROMSTART;
				}
				else if (this.changeToStartFrom === this.BLENDATCURRENTTIMERATIO)
				{
					this.changeToStartFrom = this.PLAYFROMCURRENTTIME;
				}
			}
		}
		
		CheckForChangedOrForced()
		{
			if (this.force)
			{
				this.force = false;
				return true;
			}
			
			var changed = null;
			if (!this.animPlaying)
			{
				if (!this.lastKnownInstDataAsObj || !this.instsEqual(this.lastKnownInstDataAsObj, this))
				{
					changed = true;
					this.lastKnownInstDataAsObj = this.objFromInst(this);
				}
				else
				{
					var currZ = this.findInArray(this, this.GetWorldInfo().GetLayer()._GetInstances());
					if (currZ !== this.lastZ)
					{
						changed = true;
						this.lastZ = currZ;
					}
				}
			}
			
			return changed;
		}
		
		ProcessNonSoundAnimation()
		{
			if (this.animBlend !== 0 && this.secondAnimation)
			{
				if (this.changeToStartFrom === this.BLENDTOSTART)
				{
					this.secondAnimation.localTime = 0;
				}
				else
				{
					this.secondAnimation.localTime = (this.currentSpriterTime / this.currentAnimation.length) * this.secondAnimation.length;
				}
				this.setMainlineKeyByTime(this.secondAnimation);
				var secondTweenedBones = this.currentTweenedBones(this.secondAnimation, false);
				this.animateCharacter(secondTweenedBones, this.secondAnimation, false);
			}

			var tweenedBones = this.currentTweenedBones();
			this.animateCharacter(tweenedBones);
			this.GetWorldInfo().SetBboxChanged();
		}
		
		SetC2ObjectsToPreAnimatedValues()
		{
			for (var i = 0; i < this.objectsToSet.length; i++)
			{
				var currentObjInstruction = this.objectsToSet[i];
				var timeline = this.timelineFromName(currentObjInstruction.objectName);
				if (timeline && timeline.currentObjectState)
				{
					// 0 = angle and position
					// 1 = angle
					// 2 = position
					var setType = currentObjInstruction.setType;

					var objState = timeline.currentObjectState;
					var c2Instances = currentObjInstruction.c2Object;
					var c2Obj;

					for (var j = 0; j < c2Instances.length; j++)
					{
						c2Obj = c2Instances[j];
						if (c2Obj)
						{
							if (setType === 0 || setType === 1)
							{
								c2Obj.GetWorldInfo().SetAngle(objState.angle);
							}

							if (setType === 0 || setType === 2)
							{
								c2Obj.GetWorldInfo().SetX(objState.x);
								c2Obj.GetWorldInfo().SetY(objState.y);
							}

							c2Obj.GetWorldInfo().SetBboxChanged();
						}
					}
				}
				if (!currentObjInstruction.pin)
				{
					this.objectsToSet.splice(i, 1);
					i--;
				}
			}
		}
		
		Tick2(ticklessRefresh)
		{
			if(this.entities.length == 0)
			{
				if((!this.getCharacterFromPreload()) && this.properties[0].length > 0)
				{
					this.LoadScon();
				}
			}
			
			this.CheckForUnneededBlend();

			if (this.changeAnimTo && !this.inAnimTrigger)
			{
				this.doAnimChange();
			}

			var animation = this.currentAnimation;
			if (!animation || this.inAnimTrigger)
			{
				return;
			}

			var changed = this.CheckForChangedOrForced();

			var pauseAllButSound = false;
			var pauseAll = false;
			if (this.pauseWhenOutsideBuffer != this.PAUSENEVER)
			{
				var outsideBuffer = this.isOutsideViewportBox();
				if (outsideBuffer)
				{
					if (this.pauseWhenOutsideBuffer == this.PAUSEALLOUTSIDEBUFFER)
					{
						pauseAll = true;
					}
					else if (this.pauseWhenOutsideBuffer == this.PAUSEALLBUTSOUNDOUTSIDEBUFFER)
					{
						pauseAllButSound = true;
					}
					this.setAllInvisible();
				}
			}
			if (this.animPlaying || changed || ticklessRefresh)
			{
				if (this.animPlaying && !ticklessRefresh)
				{
					var animFinished = this.tickCurrentAnimationTime();
					if (animFinished)
					{
						this.animationFinish(this.speedRatio < 0);
						if (this.changeAnimTo && !this.inAnimTrigger && !this.animPlaying)
						{
							this.Tick2();
							return;
						}
					}
				}
			}
			else
			{
				return;
			}

			if (pauseAll)
			{
				return;
			}
			
			animation = this.currentAnimation;
			var c2ObjectArray = this.c2ObjectArray;
			this.setMainlineKeyByTime();

			//TODO: this.runtime.redraw = true;

			if (!animation.mainlineKeys[animation.cur_frame])
			{
				return;
			}

			if (!pauseAllButSound && (this.animPlaying || changed))
			{
				this.setAllCollisionsAndVisibility(false);
				this.ProcessNonSoundAnimation();
			}
			
			if (this.animPlaying)
			{
				this.animateSounds();
				this.animateEvents();
				this.animateMeta(animation.meta);
			}

			this.SetC2ObjectsToPreAnimatedValues();
		};
		
		getAdjustedCurrentTime(animation)
		{
			var currentTime = 0;
			if (animation === this.currentAnimation)
			{
				if (this.changeToStartFrom === this.BLENDTOSTART)
				{
					currentTime = this.blendPoseTime;
				}
				else
				{
					currentTime = this.currentAdjustedTime;
				}
			}
			else
			{
				currentTime = animation.localTime;
			}
			return currentTime;
		}
		
		animateCharacter(tweenedBones, animation, applyToInstances)
		{
			animation = (typeof animation !== 'undefined') ? animation : this.currentAnimation;
			if (!animation)
			{
				return;
			}			
			
			var currentTime = this.getAdjustedCurrentTime(animation);
			
			var layer = this.GetWorldInfo().GetLayer();
			
			applyToInstances = (typeof applyToInstances !== 'undefined') ? applyToInstances : true;
			
			var nextObject = null;
			var lastTime = 0;
			var nextTime = 0;
			var refKey;
			var key = animation.mainlineKeys[animation.cur_frame];
			var previousZInst = this.GetInstance();
			for (var i = 0; i < key.objects.length; i++)
			{
				var object = key.objects[i];
				var objectRef = key.objects[i];
				nextObject = null;
				var nextFrame = null;
				if (object.type == "reference")
				{
					var refTimeline = animation.timelines[object.timeline];
					refKey = refTimeline.keys[object.key];
					var refKeyIndex = object.key;
					lastTime = refKey.time;
					var nextFrame = null;
					var keysLength = refTimeline.keys.length;
					object = refKey.objects[0];

					if (keysLength > 1)
					{
						if (refKeyIndex + 1 >= keysLength && animation.looping == "true")
						{
							nextFrame = refTimeline.keys[0];
							nextTime = nextFrame.time;
							if (currentTime > lastTime)
							{
								nextTime += animation.length;
							}
							nextObject = nextFrame.objects[0];
						}
						else if (refKeyIndex + 1 < keysLength)
						{
							nextFrame = refTimeline.keys[refKeyIndex + 1];
							nextTime = nextFrame.time;
							nextObject = nextFrame.objects[0];
						}
					}
				}

				var c2Obj = refTimeline.c2Object;
				if (c2Obj || refTimeline.objectType === "point")
				{
					var inst;
					if (c2Obj)
					{
						inst = c2Obj.inst;
					}
					else
					{
						inst = null;
					}
					
					if ((inst || this.drawSelf) || refTimeline.objectType === "point" || refTimeline.objectType === "entity")
					{
						if (applyToInstances && inst)
						{
							if(this.setCollisionsForObjects)
							{
								inst.GetWorldInfo().SetCollisionEnabled(true);
							}
							if(this.setVisibilityForObjects)
							{
								inst.GetWorldInfo().SetVisible(this.GetWorldInfo().IsVisible());
							}
							if (this.setLayersForSprites)
							{
								this.MoveToLayer(inst, this.layer);
							}
						}

						var tweenedObj = null;

						if (nextObject && key.curveType !== "instant" && refKey.curveType !== "instant")
						{
							var t = 0;
							if (currentTime < lastTime)
							{
								lastTime -= animation.length;
							}
							if ((nextTime - lastTime) > 0)
							{
								t = (currentTime - lastTime) / (nextTime - lastTime);
							}
							t = this.trueT(refKey, t);
							tweenedObj = this.TweenedSpriterObject(object, nextObject, t, refKey.spin);
						}
						else
						{
							tweenedObj = this.CloneObject(object);
						}
						if (applyToInstances && c2Obj && c2Obj.spriterType == "sprite")
						{
							tweenedObj.frame = this.SetSpriteAnimFrame(inst, object.frame, c2Obj);
							if(inst && this.setLayersForSprites)
							{
								inst.GetWorldInfo().ZOrderMoveAdjacentToInstance(previousZInst, true);
								previousZInst = inst;
							}
						}
						
						var mirror_factor = (this.xFlip == 1 ? -1 : 1);
						var flip_factor = (this.yFlip == 1 ? -1 : 1);

						var parent = objectRef.parent;

						refTimeline.currentMappedState = this.CloneObject(tweenedObj);
						if (animation === this.currentAnimation)
						{
							if (this.animBlend !== 0 && this.secondAnimation)
							{
								var secondTimeline = this.timelineFromName(refTimeline.name, this.secondAnimation);
								if (secondTimeline)
								{
									var secondBone = secondTimeline.currentObjectState;
									if (secondBone)
									{
										var firstBone = tweenedObj;
										tweenedObj = this.TweenedSpriterObject(firstBone, secondBone, this.animBlend, this.shortestSpin(firstBone.angle, secondBone.angle));
										if (this.animBlend > 0.5)
										{
											tweenedObj.frame = this.SetSpriteAnimFrame(inst, secondTimeline.currentObjectState.frame, c2Obj);
										}
									}
								}
							}
						}

						if (animation === this.currentAnimation)
						{
							var flip = false;
							if (parent > -1)
							{
								tweenedObj = this.mapObjToObj(tweenedBones[parent], tweenedObj, tweenedBones[parent].xScale * tweenedBones[parent].yScale);
								tweenedObj.xScale *= mirror_factor;
								tweenedObj.yScale *= flip_factor;
								flip = tweenedBones[parent].xScale < 0;
							}
							else
							{
								tweenedObj.x *= mirror_factor * this.scaleRatio * this.subEntScaleX;
								tweenedObj.y *= flip_factor * this.scaleRatio * this.subEntScaleY;
								tweenedObj.xScale *= this.subEntScaleX;
								tweenedObj.yScale *= this.subEntScaleY;
								tweenedObj = this.mapObjToObj(this.objFromInst(this), tweenedObj, mirror_factor * flip_factor);
								flip = mirror_factor < 0;
							}
							if (refTimeline.objectType === "point" && flip)
							{
								tweenedObj.angle = tweenedObj.angle - this.toRadians(180);
							}
						}
						var overrodeImage = false;
						if ((inst || (this.drawSelf && c2Obj)) && applyToInstances)
						{
							overrodeImage = this.applyObjToInst(tweenedObj, inst, parent > -1, c2Obj);
						}

						refTimeline.currentObjectState = tweenedObj;

						if (this.drawSelf && parent == -1)
						{
							refTimeline.currentObjectState.xScale *= this.scaleRatio;
							refTimeline.currentObjectState.yScale *= this.scaleRatio;
						}
						if (!overrodeImage)
						{
							refTimeline.currentObjectState.frame = refTimeline.currentMappedState.frame;
						}

						if (this.drawSelf)
						{
							if (tweenedObj.defaultPivot)
							{
								var curPivot = c2Obj.obj.pivots[refTimeline.currentObjectState.frame];
								if (!curPivot)
								{
									curPivot = c2Obj.obj.pivots[0];
								}
								if (curPivot)
								{
									refTimeline.currentObjectState.pivotX = curPivot.x;
									refTimeline.currentObjectState.pivotY = curPivot.y;
								}
							}
						}
						
						this.animateMeta(refTimeline.meta);

						if (inst && applyToInstances)
						{
							inst.GetWorldInfo().SetZElevation(this.GetWorldInfo().GetZElevation());
						}
						
					}
				}
			}
		};


		animateSounds()
		{
			var anim = this.currentAnimation;
			if (anim)
			{
				for (var s = 0; s < anim.soundlines.length; s++)
				{
					var soundLine = anim.soundlines[s];
					if (soundLine)
					{
						this.animateSound(soundLine, anim.length);
						if (anim != this.currentAnimation)
						{
							return;
						}
					}
				}
			}
		}

		animateMeta(meta, anim)
		{
			anim = (typeof anim !== 'undefined') ? anim : this.currentAnimation;
			//var anim=this.currentAnimation;
			if (anim)
			{
				this.animateTag(meta.tagline, anim.length, anim);
				for (var s = 0; s < meta.varlines.length; s++)
				{
					var varLine = meta.varlines[s];
					if (varLine)
					{
						this.animateVar(varLine, anim.length, anim);
					}
				}
			}
		}

		animateEvents()
		{
			var anim = this.currentAnimation;
			if (anim)
			{
				for (var s = 0; s < anim.eventlines.length; s++)
				{
					var eventLine = anim.eventlines[s];
					if (eventLine)
					{
						this.animateEvent(eventLine, anim.length);
						if (this.currentAnimation != anim)
						{
							return;
						}
					}
				}
			}
		}

		testTriggerTime(lastTime, time, triggerTime)
		{
			if (time == triggerTime)
			{
				return true;
			}
			else if (triggerTime == lastTime || lastTime == time)
			{
				return false;
			}
			else if (this.speedRatio > 0)
			{
				if (lastTime < time)
				{
					if (triggerTime > lastTime && triggerTime < time)
					{
						return true;
					}
				}
				else
				{
					if (triggerTime > lastTime || triggerTime < time)
					{
						return true;
					}
				}
			}
			else
			{
				if (lastTime > time)
				{
					if (triggerTime > time && triggerTime < lastTime)
					{
						return true;
					}
				}
				else
				{
					if (triggerTime > time || triggerTime < lastTime)
					{
						return true;
					}
				}
			}

			return false;
		}

		animateSound(soundline, animLength, anim)
		{
			var soundKeys = soundline.keys;
			var curSoundFrame = soundKeys.length;
			var secondTime = animLength;
			var curSoundKey = soundKeys[0];
			var curSound;
			this.animateMeta(soundline.meta);
			for (var k = 1; k < soundKeys.length; k++)
			{
				if (this.currentAdjustedTime < soundKeys[k].time)
				{
					secondTime = soundKeys[k].time;
					curSoundFrame = k - 1;
					curSoundKey = soundKeys[curSoundFrame];

					break;
				}
			}
			if (curSoundKey && curSoundKey.objects && curSoundKey.objects[0])
			{
				curSound = curSoundKey.objects[0];
			}
			anim = (typeof anim !== 'undefined') ? anim : this.currentAnimation;
			//var anim=this.currentAnimation;
			var keysLength = soundline.keys.length;
			var nextFrame;
			var nextTime;
			var nextObject;
			if (keysLength > 1)
			{
				if (curSoundFrame + 1 >= keysLength && anim.looping == "true")
				{
					nextFrame = soundline.keys[0];
					nextTime = nextFrame.time;
					if (this.currentSpriterTime > lastTime)
					{
						nextTime += anim.length;
					}
					nextObject = nextFrame.objects[0];
				}
				else if (curSoundFrame + 1 < keysLength)
				{
					nextFrame = soundline.keys[curSoundFrame + 1];
					nextTime = nextFrame.time;
					nextObject = nextFrame.objects[0];
				}
			}

			var time = this.currentAdjustedTime;
			var lastTime = soundline.lastTimeSoundCheck;

			var soundlinesToRun = [];
			if (time != lastTime)
			{
				for (var k = 0; k < soundKeys.length; k++)
				{
					var soundKey = soundKeys[k];
					if (soundKey)
					{
						var soundToPlay = soundKey.objects[0];
						if (soundToPlay)
						{
							if (this.testTriggerTime(lastTime, time, soundKey.time))
							{
								soundlinesToRun.push(
								{
									"soundline": soundline,
									"name": soundToPlay.name
								});
							}
						}
					}
				}
			}
			for (const soundline of soundlinesToRun)
			{
				this.playSound(soundline.soundline, soundline.name);
			}
			var tweenedSound;
			if (nextObject)
			{
				var t = 0;
				var lastTime = curSoundKey.time;
				if (this.currentAdjustedTime < lastTime)
				{
					lastTime -= anim.length;
				}
				var t = this.getT(lastTime, nextTime, this.currentAdjustedTime);
				tweenedSound = this.TweenedSpriterSound(curSound, nextObject, this.trueT(curSoundKey, t));
			}
			else
			{
				tweenedSound = this.cloneSound(curSound);
			}

			this.changeVolume(soundline, tweenedSound.volume);

			this.changePanning(soundline, tweenedSound.panning);
			soundline.lastTimeSoundCheck = this.currentAdjustedTime;
			soundline.currentObjectState = tweenedSound;
		}

		animateEvent(eventline, animLength, anim)
		{
			var eventKeys = eventline.keys;
			var curEventFrame = eventKeys.length;
			var secondTime = animLength;
			var curEventKey = eventKeys[0];
			var curEvent;
			this.animateMeta(eventline.meta);
			for (var k = 1; k < eventKeys.length; k++)
			{
				if (this.currentAdjustedTime < eventKeys[k].time)
				{
					secondTime = eventKeys[k].time;
					curEventFrame = k - 1;
					curEventKey = eventKeys[curEventFrame];

					break;
				}
			}
			if (curEventKey && curEventKey.objects && curEventKey.objects[0])
			{
				curEvent = curEventKey.objects[0];
			}
			anim = (typeof anim !== 'undefined') ? anim : this.currentAnimation;
		
			var keysLength = eventline.keys.length;
			var nextFrame;
			var nextTime;
			if (keysLength > 1)
			{
				if (curEventFrame + 1 >= keysLength && anim.looping == "true")
				{
					nextFrame = eventline.keys[0];
					nextTime = nextFrame.time;
					if (this.currentSpriterTime > lastTime)
					{
						nextTime += anim.length;
					}
				}
				else if (curEventFrame + 1 < keysLength)
				{
					nextFrame = eventline.keys[curEventFrame + 1];
					nextTime = nextFrame.time;
				}
			}

			var time = this.currentAdjustedTime;
			var lastTime = eventline.lastTimeEventCheck;

			var eventlinesToRun = [];
			if (time != lastTime)
			{
				for (var k = 0; k < eventKeys.length; k++)
				{
					var eventKey = eventKeys[k];
					if (eventKey)
					{
						if (this.testTriggerTime(lastTime, time, eventKey.time))
						{
							eventlinesToRun.push(eventline);
						}
					}
				}
			}

			for (const eventline of eventlinesToRun)
			{
				this.playEvent(eventline);
			}
			eventline.lastTimeEventCheck = this.currentAdjustedTime;
		}

		animateVar(varline, animLength, anim)
		{
			anim = (typeof anim !== 'undefined') ? anim : this.currentAnimation;
			var time = this.currentAdjustedTime;
			var varKeys = varline.keys;
			var firstVarFrame = -1;
			var secondVarFrame = -1;
			var firstTime = 0;
			var secondTime = 0;
			var firstVal = 0;
			var secondVal = 0;
			var type = varline.def.type;
			var firstKey;
			varline.lastTagIndex = 0;
			varline.currentVal = varline.def.def;
			
			if (varKeys.length === 0)
			{
				return;
			}
			if (varKeys.length > 1)
			{
				for (var k = 0; k < varKeys.length; k++)
				{
					if (time === varKeys[k].time)
					{
						varline.lastTagIndex = k;
						varline.currentVal = varKeys[k].val;
						return;
					}
					else if (time < varKeys[k].time)
					{
						if (k > 0)
						{
							firstVarFrame = k - 1;
							secondVarFrame = k;
						}
						else if (anim.looping === "true")
						{
							firstVarFrame = varKeys.length - 1;
							secondVarFrame = 0;
						}
						else
						{
							return;
						}

						if (firstVarFrame > -1)
						{
							firstKey = varKeys[firstVarFrame];
							var secondKey = varKeys[secondVarFrame];
							firstTime = firstKey.time;
							secondTime = secondKey.time;
							firstVal = firstKey.val;
							secondVal = secondKey.val;
							break;
						}
					}
					else if (k == varKeys.length - 1)
					{
						if (anim.looping === "true")
						{
							firstVarFrame = k;
							secondVarFrame = 0;
							firstKey = varKeys[firstVarFrame];
							var secondKey = varKeys[secondVarFrame];
							firstTime = firstKey.time;
							secondTime = secondKey.time;
							firstVal = firstKey.val;
							secondVal = secondKey.val;
						}
						else
						{
							varline.lastTagIndex = k;
							varline.currentVal = varKeys[k].val;
							return;
						}
					}
				}
			}
			else
			{
				varline.lastTagIndex = 0;
				varline.currentVal = varKeys[0].val;
				return;
			}

			varline.lastTagIndex = firstVarFrame;

			if (type === "string")
			{
				varline.currentVal = firstVal;
				return;
			}

			if (firstTime > time)
			{
				firstTime -= anim.length;
			}
			if (secondTime < time)
			{
				secondTime += anim.length;
			}

			var t = this.getT(firstTime, secondTime, time);

			varline.currentVal = this.lerp(firstVal, secondVal, this.trueT(firstKey, t));
			if (type === "int")
			{
				varline.currentVal = Math.floor(varline.currentVal);
			}
		}
		animateTag(tagline, animLength, anim)
		{
			var tagKeys = tagline.keys;
			var curTagFrame = tagKeys.length;
			var secondTime = animLength;
			var curTagKey = tagKeys[0];
			if (curTagKey && curTagKey.time > this.currentAdjustedTime && anim.looping == "true")
			{
				curTagKey = tagKeys[tagKeys.length - 1];
			}
			var curTags = [];

			for (var k = 1; k < tagKeys.length; k++)
			{
				if (this.currentAdjustedTime < tagKeys[k].time)
				{
					secondTime = tagKeys[k].time;
					curTagFrame = k - 1;
					curTagKey = tagKeys[curTagFrame];

					break;
				}
				else if(k == tagKeys.length - 1 && this.currentAdjustedTime >= tagKeys[k].time)
				{
					curTagFrame = k;
					curTagKey = tagKeys[curTagFrame];
				}
			}
			if (curTagKey)
			{
				curTags = curTagKey.tags;
			}

			tagline.lastTagIndex = curTagFrame;
			tagline.currentTags = curTags;
		}
		playSound(soundLine, name)
		{
			this.soundToTrigger = name;
			this.soundLineToTrigger = soundLine;
			this.Trigger(C3.Plugins.Spriter.Cnds.OnSoundTriggered, this);
		}

		playEvent(eventLine, name)
		{
			this.eventToTrigger = eventLine.name;
			this.eventLineToTrigger = eventLine;
			this.Trigger(C3.Plugins.Spriter.Cnds.OnEventTriggered, this);
		}

		changeVolume(soundLine, newVolume)
		{
			if (soundLine.currentObjectState.volume != newVolume)
			{
				soundLine.currentObjectState.volume = newVolume;
				this.soundToTrigger = "";
				this.soundLineToTrigger = soundLine;
				this.Trigger(C3.Plugins.Spriter.Cnds.OnSoundVolumeChangeTriggered, this);
			}
		}
		changePanning(soundLine, newPanning)
		{
			if (soundLine.currentObjectState.panning != newPanning)
			{
				soundLine.currentObjectState.panning = newPanning;
				this.soundToTrigger = "";
				this.soundLineToTrigger = soundLine;
				this.Trigger(C3.Plugins.Spriter.Cnds.OnSoundPanningChangeTriggered, this);
			}
		}

		findObjectItemInArray(name, objectArray, entityName)
		{
			for (var o = 0; o < objectArray.length; o++)
			{
				var obj = objectArray[o];
				if (obj && (obj.name === name || (obj.entityName === entityName && obj.originalName === name)))
				{
					return o;
				}
			}

			return -1;
		}

		objectFromArray(name, objectArray, entityName)
		{
			for (var o = 0; o < objectArray.length; o++)
			{
				var obj = objectArray[o];
				if (obj && (obj.name === name || (obj.entityName === entityName && obj.originalName === name)))
				{
					return obj;
				}
			}
		}


		timelineFromName(name, anim)
		{
			anim = typeof anim !== 'undefined' ? anim : this.currentAnimation;
			//var anim=this.currentAnimation;
			if (anim)
			{
				for (var t = 0; t < anim.timelines.length; t++)
				{
					var timeline = anim.timelines[t];
					if (timeline && timeline.name === name)
					{
						return timeline;
					}
				}
				for (var t = 0; t < anim.soundlines.length; t++)
				{
					var timeline = anim.soundlines[t];
					if (timeline && timeline.name === name)
					{
						return timeline;
					}
				}
				for (var t = 0; t < anim.eventlines.length; t++)
				{
					var timeline = anim.eventlines[t];
					if (timeline && timeline.name === name)
					{
						return timeline;
					}
				}
			}
		}

		tagStatus(tagname, meta)
		{
			if (meta)
			{
				for (var t = 0; t < meta.tagline.currentTags.length; t++)
				{
					var tag = meta.tagline.currentTags[t];
					if (tag)
					{
						if (tag == tagname)
						{
							return true;
						}
					}
				}
			}
			return false;
		}

		varStatus(varname, meta)
		{
			if (meta)
			{
				for (var v = 0; v < meta.varlines.length; v++)
				{
					var varline = meta.varlines[v];
					if (varline)
					{
						if (varline.def.name == varname)
						{
							return varline.currentVal;
						}
					}
				}
			}
			return 0;
		}

		loadTagDefs(json)
		{
			if (json)
			{
				var tags = json["tag_list"];
				if (tags)
				{
					for (var t = 0; t < tags.length; t++)
					{
						var tagDef = tags[t];
						this.tagDefs.push(tagDef["name"]);
					}
				}
			}
		}

		loadVarDefs(json, varDefs)
		{
			if (json)
			{
				for (var d = 0; d < json.length; d++)
				{
					var defJson = json[d];
					if (defJson)
					{
						var newVarDef = new VarDef();
						newVarDef.name = defJson.name;
						newVarDef.type = defJson.type;
						newVarDef.def = defJson["default"];
						varDefs.push(newVarDef);
					}
				}
			}
		}

		findSprites(xml) //XMLDocument object, name of entityToLoad
		{
			if (!xml)
			{
				return;
			}

			var thisTypeName = this.GetObjectClass().GetName();;
			var att;

			var json = xml; //.spriter_data")[0];
			var folderTags = json["folder"];
			for (var d = 0; d < folderTags.length; d++)
			{
				var folderTag = folderTags[d];
				this.folders.push(new SpriterFolder());
				var fileTags = folderTag["file"];

				for (var f = 0; f < fileTags.length; f++)
				{
					var fileTag = fileTags[f];
					att = fileTag;

					var spriterFile = new SpriterFile();
					spriterFile.fileName = att["name"];
					if (fileTag.hasOwnProperty("pivot_x"))
					{
						spriterFile.pivotX = (att["pivot_x"]);
					}
					if (fileTag.hasOwnProperty("pivot_y"))
					{
						spriterFile.pivotY = 1.0 - (att["pivot_y"]);
					}
					if (fileTag.hasOwnProperty("width"))
					{
						spriterFile.w = (att["width"]);
					}
					if (fileTag.hasOwnProperty("height"))
					{
						spriterFile.h = (att["height"]);
					}
					if (this.drawSelf)
					{
						if (fileTag.hasOwnProperty("ax"))
						{
							spriterFile.atlasX = (att["ax"]);
						}
						if (fileTag.hasOwnProperty("ay"))
						{
							spriterFile.atlasY = (att["ay"]);
						}
						if (fileTag.hasOwnProperty("axoff"))
						{
							spriterFile.atlasXOff = (att["axoff"]);
						}
						if (fileTag.hasOwnProperty("ayoff"))
						{
							spriterFile.atlasYOff = (att["ayoff"]);
						}
						if (fileTag.hasOwnProperty("aw"))
						{
							spriterFile.atlasW = (att["aw"]);
						}
						if (fileTag.hasOwnProperty("ah"))
						{
							spriterFile.atlasH = (att["ah"]);
						}
						if (fileTag.hasOwnProperty("arot"))
						{
							spriterFile.atlasRotated = (att["arot"]) == "true" ? true : false;
						}
					}
					this.folders[d].files.push(spriterFile);
				}
			}

			var objectArray = [];

			var NO_INDEX = -1;
			var entityTags = json["entity"];
			
			for (var e = 0; e < entityTags.length; e++)
			{
				var entityTag = entityTags[e];
				att = entityTag;

				var objInfoTags = entityTag["obj_info"];
				var charMapTags = entityTag["character_map"];
				var entityName = att.name;
				if (objInfoTags)
				{
					for (var o = 0; o < objInfoTags.length; o++)
					{
						var infoTag = objInfoTags[o];
						if (infoTag)
						{
							var objInfo = new ObjInfo();
							objInfo.name = infoTag["realname"];
							if (!objInfo.name)
							{
								objInfo.name = infoTag["name"];
							}
							this.loadVarDefs(infoTag["var_defs"], objInfo.varDefs);
							this.boneWidthArray[objInfo.name] = infoTag["w"];
							this.objInfoVarDefs.push(objInfo);
						}
						if (infoTag && (infoTag["type"] === "sprite" || infoTag["type"] === "box" || infoTag["type"] === "entity"))
						{
							var typeName = infoTag["name"];
							var originalName = infoTag["realname"];
							var varDefs = [];
							if (infoTag["var_defs"])
							{
								this.loadVarDefs(infoTag["var_defs"], varDefs);
							}
							objectArray.push(new SpriterObjectArrayItem(thisTypeName, typeName, entityName, originalName, varDefs));
							var lastObj = objectArray[objectArray.length - 1];
							if (infoTag["type"] === "box")
							{
								lastObj.width = infoTag["w"];
								lastObj.height = infoTag["h"];
								lastObj.isBox = true;
								lastObj.spriterType = "box";
								var imageSize = {};
								imageSize.w = lastObj.width;
								imageSize.h = lastObj.height;
								lastObj.imageSizes.push(imageSize);
							}
							if (infoTag["type"] === "entity")
							{
								//lastObj.isBox=true;
								lastObj.spriterType = "entity";
							}
							else if (infoTag["type"] === "sprite")
							{
								var frames = infoTag["frames"];
								if (frames)
								{
									for (var f = 0; f < frames.length; f++)
									{
										var frame = frames[f];
										if (this.folders[frame["folder"]] && this.folders[frame["folder"]].files[frame["file"]])
										{
											lastObj.frames.push(this.folders[frame["folder"]].files[frame["file"]].fileName);
											var pivot = {};
											pivot.x = 0;
											pivot.y = 0;
											pivot.x = this.folders[frame["folder"]].files[frame["file"]].pivotX;
											pivot.y = this.folders[frame["folder"]].files[frame["file"]].pivotY;
											lastObj.pivots.push(pivot);

											var imageSize = {};
											imageSize.w = 1;
											imageSize.h = 1;
											var currentFile = this.folders[frame["folder"]].files[frame["file"]];
											imageSize.w = currentFile.w;
											imageSize.h = currentFile.h;
											if (this.drawSelf)
											{
												imageSize.fileName = currentFile.fileName;
												imageSize.atlasW = currentFile.atlasW;
												imageSize.atlasH = currentFile.atlasH;
												imageSize.atlasX = currentFile.atlasX;
												imageSize.atlasY = currentFile.atlasY;
												imageSize.atlasXOff = currentFile.atlasXOff;
												imageSize.atlasYOff = currentFile.atlasYOff;
												imageSize.atlasRotated = currentFile.atlasRotated;
											}
											lastObj.imageSizes.push(imageSize);
										}
									}
								}
								if (charMapTags)
								{
									for (var c = 0; c < charMapTags.length; c++)
									{
										var charMapTag = charMapTags[c];
										var mapTags = charMapTag["map"];
										if (mapTags)
										{
											for (var m = 0; m < mapTags.length; m++)
											{
												var mapTag = mapTags[m];
												if (typeof mapTag["folder"] !== "undefined" && typeof mapTag["file"] !== "undefined")
												{
													if (this.folders[mapTag["folder"]] && this.folders[mapTag["folder"]].files[mapTag["file"]])
													{
														var charMap = {};
														charMap.oldFrame = lastObj.frames.indexOf(this.folders[mapTag["folder"]].files[mapTag["file"]].fileName);
														if (charMap.oldFrame > -1)
														{
															charMap.newFrame = -1;
															if (typeof mapTag["target_folder"] !== "undefined" && typeof mapTag["target_file"] !== "undefined")
															{

																charMap.newFrame = lastObj.frames.indexOf(this.folders[mapTag["target_folder"]].files[mapTag["target_file"]].fileName);
															}
															if (!lastObj.charMaps[charMapTag["name"]])
															{
																lastObj.charMaps[charMapTag["name"]] = [];
															}
															lastObj.charMaps[charMapTag["name"]].push(charMap);
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
			return objectArray;
		};

		generateTestC2ObjectArray(objectArray)
		{
			var c2Objects = [];
			var runtime = this.GetRuntime();
			for (var o = 0, len = objectArray.length; o < len; o++)
			{
				var c2Object = {};
				c2Object.type = runtime.GetObjectClassByName(objectArray[o].fullTypeName);
				c2Object.spriterType = objectArray[o].spriterType;
				c2Object.inst = null;
				c2Object.appliedMap = [];
				c2Object.obj = objectArray[o];
				c2Objects.push(c2Object);
			}
			return c2Objects;
		};
		cloneSound(other)
		{
			var sound = new SpriterSound();
			sound.trigger = other.trigger;
			sound.volume = other.volume;
			sound.panning = other.panning;
			sound.name = other.name;
			return sound;
		};

		objectFromTag(objectTag, objectArray, timelineName, object_type, entityName)
		{
			var att = objectTag;

			var folderIndex = -null;
			var fileIndex = null;
			var fileName = null;
			var NO_INDEX = -1;
			var object = new SpriterObject();
			object.type = object_type;
			if (object_type === "sprite")
			{
				folderIndex = att["folder"];
				fileIndex = att["file"];
				file = this.folders[folderIndex].files[fileIndex];
				var objectItem = objectArray[this.findObjectItemInArray(timelineName, objectArray, entityName)];
				object.frame = objectItem.frames.indexOf(file.fileName);
				object.storedFrame = object.frame;
			}
			if (objectTag.hasOwnProperty("x"))
			{
				object.x = (att["x"]);
			}
			if (objectTag.hasOwnProperty("y"))
			{
				object.y = -(att["y"]);
			}
			if (objectTag.hasOwnProperty("angle"))
			{
				object.angle = ((att["angle"]));
			}
			if (objectTag.hasOwnProperty("a"))
			{
				object.a = ((att["a"]));
			}
			object.angle = 360 - object.angle;
			object.angle /= 360;

			if (object.angle > 0.5)
			{
				object.angle -= 1;
			}

			object.angle *= 3.141592653589793 * 2;

			if (objectTag.hasOwnProperty("scale_x"))
			{
				object.xScale = (att["scale_x"]);
			}

			if (objectTag.hasOwnProperty("scale_y"))
			{
				object.yScale = (att["scale_y"]);
			}

			if (objectTag.hasOwnProperty("entity"))
			{
				object.entity = (att["entity"]);
			}

			if (objectTag.hasOwnProperty("animation"))
			{
				object.animation = (att["animation"]);
			}

			if (objectTag.hasOwnProperty("t"))
			{
				object.t = (att["t"]);
			}

			if (objectTag.hasOwnProperty("pivot_x"))
			{
				object.pivotX = (att["pivot_x"]);
			}
			else if (object_type === "sprite")
			{
				var folders = this.folders;
				var folder = folders[folderIndex];
				object.defaultPivot = true;
				if (folder)
				{
					var file = folder.files[fileIndex];
					if (file)
					{
						object.pivotX = file.pivotX;
					}
				}
			}

			if (objectTag.hasOwnProperty("pivot_y"))
			{
				object.pivotY = 1 - (att["pivot_y"]);
			}
			else if (object_type === "sprite")
			{
				var folders = this.folders;
				var folder = folders[folderIndex];
				object.defaultPivot = true;
				if (folder)
				{
					var file = folder.files[fileIndex];
					if (file)
					{
						object.pivotY = file.pivotY;
					}
				}
			}
			return object;
		};
		soundFromTag(soundTag)
		{
			var sound = new SpriterSound();
			if (soundTag["folder"] !== undefined && soundTag["file"] !== undefined)
			{
				var file = this.folders[soundTag["folder"]].files[soundTag["file"]];
				if (file)
				{
					sound.name = file.fileName;
					sound.name = sound.name.substr(0, sound.name.lastIndexOf("."));
					sound.name = sound.name.substr(sound.name.lastIndexOf("/") + 1, sound.name.length);
				}
			}

			if (soundTag.hasOwnProperty("trigger"))
			{
				sound.trigger = soundTag["trigger"];
			}
			if (soundTag.hasOwnProperty("panning"))
			{
				sound.panning = soundTag["panning"];
			}
			if (soundTag.hasOwnProperty("volume"))
			{
				sound.volume = soundTag["volume"];
			}

			return sound;
		};
		initDOMtoPairedObjects()
		{
			var entities = this.entities;
			for (var e = 0; e < entities.length; e++)
			{
				var entity = entities[e];
				if (entity)
				{
					var animations = entity.animations;
					if (animations)
					{
						for (var a = 0; a < animations.length; a++)
						{
							var animation = animations[a];
							if (animation)
							{
								var timelines = animation.timelines;
								if (timelines)
								{
									for (var t = 0; t < timelines.length; t++)
									{
										var timeline = timelines[t];
										if (timeline)
										{
											timeline.c2Object = this.c2ObjectArray[this.findObjectItemInArray(timeline.name, this.objectArray, entity.name)];
										}
									}
								}
							}
						}
					}
				}
			}
		};
		
		associateAllTypes()
		{
			var c2ObjectArray = this.c2ObjectArray;
			var objectArray = this.objectArray;

			for (var o = 0, len = objectArray.length; o < len; o++)
			{
				var obj = objectArray[o];

				var siblings = this.GetInstance().GetSiblings();
				if (siblings && siblings.length > 0)
				{
					for (var s = 0; s < siblings.length; s++)
					{
						var sibling = siblings[s];
						if (sibling)
						{
							var type = sibling.GetObjectClass().GetSdkType();
							if (sibling.GetObjectClass().GetName() === obj.fullTypeName)
							{
								var c2Object = c2ObjectArray[o];
								c2Object.type = type;
								//var iid = this.get_iid(); // get my IID
								var paired_inst = sibling;
								c2Object.inst = paired_inst;
								var animations = this.entity.animations;
								var name = obj.name;
								for (var a = 0; a < animations.length; a++)
								{
									var animation = animations[a];
									var timelines = animation.timelines;
									for (var t = 0; t < timelines.length; t++)
									{
										var timeline = timelines[t];
										if (name == timeline.name)
										{
											timeline.c2Object = c2Object;
										}
									}
								}
								break;
							}
						}
					}
				}
				else
				{
					var obj = objectArray[o];
					var c2Object = c2ObjectArray[o];
					var type = c2Object.type;
					if (type)
					{
						obj.fullTypeName = type.GetName();
						c2Object.type = type;
						var iid = this.GetInstance().GetIID(); // get my IID
						var paired_inst = type.GetInstanceByIID(iid);
						c2Object.inst = paired_inst;
						var animations = this.entity.animations;
					}
					break;
				}
			}
		};
        _UpdateCurrentTexture() {
            const curImageInfo = this.GetObjectClass().GetAnimations()[0].GetFrames()[0].GetImageInfo();
            this._currentTexture = curImageInfo.GetTexture();
            this._currentRcTex = curImageInfo.GetTexRect();
            this.GetWorldInfo().SetMeshChanged(true)
        };
		loadSCML(json_)
		{
			this.loadTagDefs(json_);
			this.objectArray = this.findSprites(json_);
			if (!this.GetSdkType().objectArrays[this.properties[0]])
			{
				this.GetSdkType().objectArrays[this.properties[0]] = this.objectArray;
				this.GetSdkType().boneWidthArrays[this.properties[0]] = this.boneWidthArray;
			}
			this.c2ObjectArray = this.generateTestC2ObjectArray(this.objectArray);
			var thisTypeName = this.GetObjectClass().GetName();;
			var att;

			var json = json_;
			var folderTags = json["folder"];

			var NO_INDEX = -1;
			var entityTags = json["entity"];
			for (var e = 0; e < entityTags.length; e++)
			{
				var entityTag = entityTags[e];
				att = entityTag;

				var entity = new SpriterEntity();
				att = entityTag;
				entity.name = att["name"];
				this.loadVarDefs(entityTag["var_defs"], entity.varDefs);
				var animationTags = entityTag["animation"];
				
				for (var a = 0; a < animationTags.length; a++)
				{
					var animationTag = animationTags[a];
					att = animationTag;
					var animation = new SpriterAnimation();
					animation.name = att["name"];
					animation.length = att["length"];

					if (animationTag.hasOwnProperty("looping"))
					{
						animation.looping = att["looping"];
					}
					if (animationTag.hasOwnProperty("loop_to"))
					{
						animation.loopTo = att["loop_to"];
					}
					if (animationTag.hasOwnProperty("l"))
					{
						animation.l = att["l"];
					}
					if (animationTag.hasOwnProperty("r"))
					{
						animation.r = att["r"];
					}
					if (animationTag.hasOwnProperty("t"))
					{
						animation.t = att["t"];
					}
					if (animationTag.hasOwnProperty("b"))
					{
						animation.b = att["b"];
					}

					var mainlineTag = animationTag["mainline"];

					var mainline = new SpriterTimeline();

					var keyTags = mainlineTag["key"];
					for (var k = 0; k < keyTags.length; k++)
					{
						var keyTag = keyTags[k];
						var key = new SpriterKey();
						att = keyTag;
						this.setTimeInfoFromJson(keyTag, key);
						var boneRefTags = keyTag["bone_ref"];
						if (boneRefTags)
						{
							for (var o = 0; o < boneRefTags.length; o++)
							{
								var boneRefTag = boneRefTags[o];
								att = boneRefTag;
								var boneRef = new SpriterObjectRef();
								boneRef.timeline = att["timeline"];
								boneRef.key = att["key"];
								if (boneRefTag.hasOwnProperty("parent"))
								{
									boneRef.parent = att["parent"];
								}
								key.bones.push(boneRef);
							}
						}

						var objectRefTags = keyTag["object_ref"];
						if (objectRefTags)
						{
							for (var o = 0; o < objectRefTags.length; o++)
							{
								var objectRefTag = objectRefTags[o];
								att = objectRefTag;
								var objectRef = new SpriterObjectRef();
								objectRef.timeline = att["timeline"];
								objectRef.key = att["key"];
								if (objectRefTag.hasOwnProperty("parent"))
								{
									objectRef.parent = att["parent"];
								}
								key.objects.push(objectRef);
							}
						}
						animation.mainlineKeys.push(key);
					}
					animation.mainline = mainline;
					var timelineTags = animationTag["timeline"];
	
					this.setTimelinesFromJson(timelineTags, animation.timelines, entity);

					timelineTags = animationTag["soundline"];
					this.setSoundlinesFromJson(timelineTags, animation.soundlines, entity.name);

					timelineTags = animationTag["eventline"];
					this.setEventlinesFromJson(timelineTags, animation.eventlines, entity.name);

					timelineTags = animationTag["meta"];

					this.setMetaDataFromJson(timelineTags, animation.meta, entity.varDefs);
					entity.animations.push(animation);
				}
				this.entities.push(entity);
				if (!this.entity || this.properties[1] === entity.name)
				{
					this.entity = entity;
				}
			}
		};
		setAnimToIndex(animIndex)
		{
			if (this.entity && this.entity.animations.length > animIndex)
			{
				this.playTo = -1;
				this.changeAnimTo = this.entity.animations[animIndex];
				this.changeToStartFrom = 2;

				var anim = this.currentAnimation;
				if (anim)
				{
					this.animPlaying = true;
				}

				//this.setAllCollisionsAndVisibility(false);

				this.runtime.Tick2(this);
			}
		}

		FrameDataFromImageInfo(imageInfo)
		{
			var frameData=
			[
				imageInfo._imageAsset._url,
				imageInfo._imageAsset._size,
				imageInfo._offsetX,
				imageInfo._offsetY,
				imageInfo._width,
				imageInfo._height,
				1,
				0,
				0,
				[],
				C3.New(C3.CollisionPoly),
				imageInfo._pixelFormat
			];
			return frameData;
		}
		
		setAnim(animName, startFrom, blendDuration)
		{
			var ratio = 0;
			// startFrom
			// 0 play from start
			// 1 play from current time
			// 2 play from current time ratio
			// 3 blend to start
			// 4 blend at current time ratio

			if ((startFrom == 1 || startFrom == 2) && this.currentAnimation && animName == this.currentAnimation.name)
			{
				return;
			}

			if (startFrom > this.PLAYFROMCURRENTTIMERATIO && blendDuration > 0)
			{
				var secondAnim = this.getAnimFromEntity(animName);
				if (secondAnim === this.secondAnimation && this.blendEndTime > 0)
				{
					return;
				}

				if (secondAnim === this.currentAnimation)
				{
					if (!this.secondAnimation)
					{
						this.blendStartTime = 0;
						this.blendEndTime = 0;
						this.blendPoseTime = 0;
						this.secondAnimation = null;
						this.animBlend = 0;
						this.changeAnimTo = null;
						return;
					}
					else
					{
						this.currentAnimation = this.secondAnimation;
						this.animBlend = 1.0 - this.animBlend;
					}
				}
				else
				{
					this.animBlend = 0;
				}
				this.secondAnimation = secondAnim;

				this.blendStartTime = this.getNowTime();
				this.blendPoseTime = 0;			
				this.blendEndTime = this.blendStartTime + ((blendDuration/1000) / (this.ignoreGlobalTimeScale ? 1 : this.GetRuntime().GetTimeScale()));
			}
			else
			{
				if (blendDuration <= 0)
				{
					if (startFrom === this.BLENDATCURRENTTIMERATIO)
					{
						startFrom = 2;
					}
					else if (startFrom == this.BLENDTOSTART)
					{
						startFrom = 0;
					}
				}
				this.blendStartTime = 0;
				this.blendEndTime = 0;
				this.blendPoseTime = 0;
				this.secondAnimation = null;
			}

			this.changeToStartFrom = startFrom;
			if (startFrom === this.BLENDTOSTART && this.secondAnimation)
			{
				this.blendPoseTime = this.currentSpriterTime;
				this.secondAnimation.localTime = 0;
				this.setMainlineKeyByTime(this.secondAnimation);
				var secondTweenedBones = this.currentTweenedBones(this.secondAnimation);
				this.animateCharacter(secondTweenedBones, this.secondAnimation, false);
			}
			this.setAnimTo(animName, false, true);
			var animPlaying = this.animPlaying;
			this.animPlaying = false;
			this.Tick2(true);
			this.animPlaying = animPlaying;
		};
		doRequest(json, url_, method_)
		{
			// Create a context object with the tag name and a reference back to this
			var self = this;
			var request = null;

			var errorFunc = function()
			{
				//self.runtime.trigger(cr.plugins_.AJAX.prototype.cnds.OnError, self);
			};

			try
			{
				var data = json;
				self.loadSCML(data);
				// self.GetSdkType().scmlFiles[self.properties[0]] = self.entities;
				self.Trigger(C3.Plugins.Spriter.Cnds.readyForSetup, self);
				self.setAnimTo(self.properties[2], true);
				if (!self.currentAnimation && self.entity && self.entity.animations.length)
				{
					self.setAnimTo(self.entity.animations[0].name, true);
				}
				for (var i = 0; i < self.GetSdkType().scmlInstsToNotify[self.properties[0]].length; i++)
				{
					var inst = self.GetSdkType().scmlInstsToNotify[self.properties[0]][i];
					inst.forceCharacterFromPreload();
				}
				//delete self.GetSdkType().scmlReserved[self.properties[0]];
				self.GetSdkType().scmlInstsToNotify[self.properties[0]] = [];
			}
			catch (e)
			{
				//errorFunc();
			}

		};

		getAnimFromEntity(animName)
		{
			if (!this.entity || !this.entity.animations)
			{
				return;
			}
			for (var a = 0, len = this.entity.animations.length; a < len; a++)
			{
				if (this.entity.animations[a].name == animName)
				{
					return this.entity.animations[a];
				}
			}
		};

		mapObjToObj(parentObject, obj, flipAngle)
		{
			var returnObj = new SpriterObject();
			returnObj.xScale = obj.xScale * parentObject.xScale;
			returnObj.yScale = obj.yScale * parentObject.yScale;
			if (flipAngle < 0)
			{
				returnObj.angle = ((3.141592653589793 * 2) - obj.angle) + parentObject.angle;
			}
			else
			{
				returnObj.angle = obj.angle + parentObject.angle;
			}
			var x = obj.x * parentObject.xScale;
			var y = obj.y * parentObject.yScale;
			var angle = parentObject.angle;
			var s = 0;
			var c = 1;

			if (angle != 0)
			{
				s = Math.sin(angle);
				c = Math.cos(angle);
			}
			var xnew = (x * c) - (y * s);
			var ynew = (x * s) + (y * c);

			returnObj.a = parentObject.a * obj.a;
			returnObj.pivotX = obj.pivotX;
			returnObj.pivotY = obj.pivotY;
			returnObj.defaultPivot = obj.defaultPivot;
			returnObj.x = xnew + parentObject.x;
			returnObj.y = ynew + parentObject.y;
			returnObj.entity = obj.entity;
			returnObj.animation = obj.animation;
			returnObj.t = obj.t;

			return returnObj;
		};

		instsEqual(obj, inst)
		{
			var worldInfo = inst.GetWorldInfo();
			return obj.x == worldInfo.GetX() && obj.y == worldInfo.GetY() && obj.a == worldInfo.GetOpacity() && obj.angle == worldInfo.GetAngle() && obj.visible == inst.GetWorldInfo().IsVisible();
		};

		objFromInst(inst)
		{
			var obj = new SpriterObject();
			inst = inst.GetWorldInfo();
			obj.pivotX = inst.GetOriginX();//hotspotX;
			obj.pivotY = inst.GetOriginY();//hotspotY;
			obj.defaultPivot = false;
			obj.x = inst.GetX();//x;
			obj.y = inst.GetY();//y;
			obj.a = inst.GetOpacity();//opacity;
			obj.angle = inst.GetAngle();//angle;
			obj.storedFrame = inst.storedFrame;
			obj.frame = inst.curFrame;
			obj.visible = inst.IsVisible();
			//obj.frame = inst.GetSdkInstance()._currentFrameIndex;
			return obj;
		};
		currentFrame()
		{
			if (this.currentAnimation)
			{
				return this.currentAnimation.cur_frame;
			}
			return 0;
		}
		applyPivotToInst(inst, pivotX, pivotY, objWidth, objHeight)
		{
			var x = -1 * pivotX * objWidth;
			var y = -1 * pivotY * objHeight;
			var angle = inst.GetWorldInfo().GetAngle();
			var s = 0;
			var c = 1;

			if (angle != 0)
			{
				s = Math.sin(angle);
				c = Math.cos(angle);
			}
			var xnew = (x * c) - (y * s);
			var ynew = (x * s) + (y * c);

			inst.GetWorldInfo().SetX(xnew + inst.GetWorldInfo().GetX());
			inst.GetWorldInfo().SetY(ynew + inst.GetWorldInfo().GetY());
		};
		distance(ax, ay, bx, by)
		{
			return Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
		}
		applyIk(targetX, targetY, addToLength, parentBone, childBoneAbs, childBoneLocal, childBoneLength)
		{
			if (!parentBone || !childBoneLocal)
			{
				return;
			}

			var ikReversal = false;
			var distanceAB = this.distance(0, 0, childBoneLocal.x * parentBone.xScale, childBoneLocal.y * parentBone.yScale);
			var distanceATarget = this.distance(parentBone.x, parentBone.y, targetX, targetY);
			var distanceBTarget = this.fabs(childBoneLength * childBoneLocal.xScale * parentBone.xScale) + addToLength;
			var parentBoneFactor = parentBone.scaleX * parentBone.scaleY < 0 ? true : false;
			if (distanceATarget > distanceAB + distanceBTarget)
			{
				var newAngle = (this.toRadians(270) - (Math.atan2(parentBone.x - targetX, parentBone.y - targetY)));
				if (parentBone.scaleX < 0)
				{
					newAngle = newAngle - this.toRadians(180);
				}
				if (this.xFlip)
				{
					newAngle -= this.toRadians(180);
				}

				parentBone.angle = newAngle;
			}
			else
			{
				var xDiff = parentBone.x - targetX;
				var yDiff = parentBone.y - targetY;

				var newAngle = Math.acos((((distanceAB * distanceAB) +
						(distanceATarget * distanceATarget) -
						(distanceBTarget * distanceBTarget)) /
					(2 * distanceAB * distanceATarget)));

				var angleOffset = this.toRadians(270) - Math.atan2(xDiff, yDiff);
				var childAngleOffset = (this.toRadians(270) - Math.atan2(parentBone.x - childBoneAbs.x, parentBone.y - childBoneAbs.y)) - parentBone.angle;
				if (childBoneLocal.angle > 0)
				{
					ikReversal = true;
				}
				newAngle = angleOffset + (newAngle * (ikReversal ? -1 : 1) * (parentBoneFactor ? -1 : 1));
				if (parentBone.scaleX < 0)
				{
					childAngleOffset = childAngleOffset - this.toRadians(180);
				}
				newAngle -= childAngleOffset;

				if (newAngle != newAngle)
				{
					newAngle = parentBone.angle;
				}
				else
				{
					if (parentBone.scaleX < 0)
					{
						newAngle = newAngle - this.toRadians(180);
					}
				}
				parentBone.angle = newAngle;
			}
			childBoneAbs = this.mapObjToObj(parentBone, childBoneLocal, parentBone.xScale * parentBone.yScale);
			var newAngle = this.toRadians(270) - Math.atan2(childBoneAbs.x - targetX, childBoneAbs.y - targetY);

			if (childBoneAbs.scaleX < 0)
			{
				newAngle -= this.toRadians(180);
			}
			if (this.xFlip)
			{
				newAngle -= this.toRadians(180);
			}
			if (parentBoneFactor)
			{
				newAngle = this.toRadians(360) - newAngle;
				newAngle *= -1;
			}

			childBoneAbs.angle = newAngle;
			return childBoneAbs;
		}

		applyObjToInst(obj, inst, dontApplyGlobalScale, c2Object)
		{
			var overrodeImage = false;
			var overrideComponents = this.objectOverrides[c2Object.obj.originalName];
			if (typeof overrideComponents !== "undefined")
			{
				for (var component in overrideComponents)
				{
					switch (component)
					{
						case this.COMPONENTANGLE:
							obj.angle = this.toRadians(overrideComponents[component]);
							this.force = true;
							break;
						case this.COMPONENTX:
							obj.x = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTY:
							obj.y = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTSCALEX:
							obj.xScale = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTSCALEY:
							obj.yScale = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTIMAGE:
							obj.frame = this.SetSpriteAnimFrame(inst, overrideComponents[component], c2Object);
							overrodeImage = true;
							this.force = true;
							break;
						case this.COMPONENTPIVOTX:
							obj.pivotX = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTPIVOTY:
							obj.pivotY = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTENTITY:
							obj.entity = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTANIMATION:
							obj.animation = overrideComponents[component];
							this.force = true;
							break;
						case this.COMPONENTTIMERATIO:
							obj.t = overrideComponents[component];
							this.force = true;
							break;
						default:
							break;
					}
				}
				// delete this.objectOverrides[c2Object.obj.originalName];
			}
			if (this.drawSelf && !c2Object.inst)
			{
				return overrodeImage;
			}
			inst.GetWorldInfo().SetAngle(obj.angle);
			inst.GetWorldInfo().SetOpacity(obj.a);
			var cur_frame = inst.GetSdkInstance()._currentFrameIndex;

			// hotspots are set back to zero if the project was imported with older versions of c2
			// which could cause the bounding box to shift incorrectly
			// this is a better failure for users who haven't reimported their projects after the update
			inst.GetWorldInfo().SetOriginX(0);
			inst.GetWorldInfo().SetOriginY(0);
			inst.GetWorldInfo().SetX(obj.x);
			inst.GetWorldInfo().SetY(obj.y);

			var trueW = inst.GetWorldInfo().GetWidth();
			var trueH = inst.GetWorldInfo().GetHeight();
			if (c2Object.obj.spriterType === "entity")
			{
				inst.subEntScaleX = obj.xScale;
				inst.subEntScaleY = obj.yScale;
				inst.GetSdkInstance().setEntToIndex(obj.entity);
				if (inst.entity)
				{
					inst.setAnimToIndex(obj.animation);
					inst.setAnimTime(1, obj.t);
				}
			}

			if (c2Object.obj.imageSizes && c2Object.obj.imageSizes.length > cur_frame)
			{
				trueW = c2Object.obj.imageSizes[cur_frame].w;
				trueH = c2Object.obj.imageSizes[cur_frame].h;
			}
			var mirror_factor = (this.xFlip == 1 ? -1 : 1);
			var flip_factor = (this.yFlip == 1 ? -1 : 1);

			var new_width = (dontApplyGlobalScale ? 1 : this.scaleRatio) * trueW * obj.xScale * mirror_factor;
			var new_height = (dontApplyGlobalScale ? 1 : this.scaleRatio) * trueH * obj.yScale * flip_factor;

			if (inst.GetWorldInfo().GetWidth() !== new_width || inst.GetWorldInfo().GetHeight() !== new_height)
			{
				inst.GetWorldInfo().SetWidth(new_width);
				inst.GetWorldInfo().SetHeight(new_height);
			}
			var pivX = obj.pivotX;
			var pivY = obj.pivotY;
			if (obj.defaultPivot)
			{
				var curPivot = c2Object.obj.pivots[inst.GetSdkInstance()._currentFrameIndex];
				if (!curPivot)
				{
					curPivot = c2Object.obj.pivots[0];
				}
				if (curPivot)
				{
					pivX = curPivot.x;
					pivY = curPivot.y;
				}
			}
			this.applyPivotToInst(inst, pivX, pivY, new_width, new_height);
			inst.GetWorldInfo().SetBboxChanged();
			return overrodeImage;
		};
		setEntTo(entName)
		{
			var entities = this.entities;
			for (var e = 0, len = entities.length; e < len; e++)
			{
				var entity = entities[e];
				if (entity && entName == entity.name)
				{
					this.entity = entity;
				}
			}
			if (!this.entity && this.entities.length)
			{
				this.entity = entities[0];
			}
			if (!this.entity)
			{
				this.startingEntName = entName;
			}
		};
		setEntToIndex(entIndex)
		{
			this.entity = this.entities[entIndex];
			if (!this.entity && this.entities.length)
			{
				this.entity = this.entities[0];
			}
		};
		setAllCollisionsAndVisibility(newState)
		{
			if(!this.setCollisionsForObjects&&!this.setVisibilityForObjects)
			{
				return;
			}
			var c2ObjectArray = this.c2ObjectArray;
			if (c2ObjectArray)
			{
				for (var o = 0; o < c2ObjectArray.length; o++)
				{
					var c2Object = c2ObjectArray[o];
					var inst = c2Object.inst;
					if (!inst)
					{
						if (!this.drawSelf && c2Object.obj && c2Object.obj.frames.length > 0)
						{
							this.associateAllTypes();
							inst = c2Object.inst;
						}
					}
					else
					{
						if(this.setCollisionsForObjects)
						{
							inst.GetWorldInfo().SetCollisionEnabled(newState);
						}
						if(this.setVisibilityForObjects)
						{
							inst.GetWorldInfo().SetVisible(newState && this.GetWorldInfo().IsVisible());
						}
					}
				}
			}
		};

		setAllInvisible()
		{
			var c2ObjectArray = this.c2ObjectArray;
			if (c2ObjectArray)
			{
				for (var o = 0; o < c2ObjectArray.length; o++)
				{
					var c2Object = c2ObjectArray[o];
					var inst = c2Object.inst;
					if (!inst)
					{
						this.associateAllTypes();
						inst = c2Object.inst;
					}
					if (inst)
					{
						inst.GetWorldInfo().SetVisible(false);
					}
				}
			}
		};
		setAnimTo(animName, tick, andStartAnim)
		{
			tick = (typeof tick !== 'undefined') ? tick : true;
			andStartAnim = (typeof andStartAnim !== 'undefined') ? andStartAnim : false;
			this.playTo = -1;
			this.changeAnimTo = this.getAnimFromEntity(animName);

			if (!this.changeAnimTo && (!this.currentAnimation) && this.entity)
			{
				this.changeAnimTo = this.entity.animations[0];
			}
			// startFrom
			// 0 play from start
			// 1 play from current time
			// 2 play from current time ratio
			// 3 blend to start
			// 4 blend at current time ratio

			if (!this.changeAnimTo)
			{
				this.startingAnimName = animName;
				this.changeToStartFrom = 0;
				this.blendStartTime = 0;
				this.blendEndTime = 0;
				this.secondAnimation = null;
				this.blendPoseTime = 0;
			}

			var anim = this.currentAnimation;
			 if (anim && andStartAnim && (this.changeAnimTo != anim || this.changeToStartFrom == 0 || this.changeToStartFrom == 3))
			 {
				 this.animPlaying = true;
			 }

			this.setAllCollisionsAndVisibility(false);

			//this.runtime.tick2Me(this);
			if (tick)
			{
				this.Tick2();
			}
		};
		resetEventChecksToCurrentTime()
		{
			this.resetEventChecksToTime(this.currentSpriterTime);
		}
		resetEventChecksToTime(time)
		{
			if (this.currentAnimation)
			{
				this.currentAdjustedTime = time;
				time -= 1;
				for (var s = 0; s < this.currentAnimation.soundlines.length; s++)
				{
					var soundline = this.currentAnimation.soundlines[s];
					if (soundline)
					{
						soundline.lastTimeSoundCheck = time;
					}
				}
				for (var e = 0; e < this.currentAnimation.eventlines.length; e++)
				{
					var eventline = this.currentAnimation.eventlines[e];
					if (eventline)
					{
						eventline.lastTimeEventCheck = time;
					}
				}
			}
		}
		setAnimTime(units, time)
		{
			var currentAnimation = this.currentAnimation;
			var lastSpriterTime = this.currentSpriterTime;
			if (currentAnimation)
			{
				if (units === 0) // milliseconds
				{
					this.currentSpriterTime = time;
				}
				else if (units == 1) // ratio
				{
					this.currentSpriterTime = time * currentAnimation.length;
				}
			}
			if (lastSpriterTime != this.currentSpriterTime)
			{
				this.force = true;
			}
		};
		soundlineFromName(name)
		{
			if (this.soundLineToTrigger && this.soundLineToTrigger.name === name)
			{
				return this.soundLineToTrigger;
			}
			var anim = this.currentAnimation;
			if (anim)
			{
				for (var s = 0; s < anim.soundlines.length; s++)
				{
					var soundline = anim.soundlines[s];
					if (soundline && soundline.name === name)
					{
						return soundline;
					}
				}
			}
		}
		
		lerp(a,b,t)
		{
			return ((b-a)*t)+a;
		}
		
		toRadians(angleInDegrees)
		{
			return angleInDegrees * 0.0174533;
		}
		
		angleDiff(a,b)
		{
			if (a === b)
				return 0;

			var pi = 3.141592653589793;
			var rad = pi * 2;
			while (b - a < -pi)
			{
				a -= rad;
			}
			while (b - a > pi)
			{
				b -= rad;
			}
			return Math.abs(b - a);
		}

		//////////////////////////////////////////
		// Action Methods
		A__setPlaybackSpeedRatio(newSpeed)
		{
			this.speedRatio = newSpeed;
		}

		A__setVisible(visible)
		{
			if (visible === 1)
			{
				this.GetWorldInfo().SetVisible(true);
			}
			else
			{
				this.GetWorldInfo().SetVisible(false);
			}
		}
		A__setOpacity(newOpacity)
		{
			this.GetWorldInfo().SetOpacity(this.clamp(0.0, 1.0, newOpacity / 100.0));
			//this.opacity = this.clamp(0.0, 1.0, newOpacity / 100.0);
		}
		A__setAutomaticPausing(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer)
		{
			this.pauseWhenOutsideBuffer = newPauseSetting;
			this.leftBuffer = leftBuffer;
			this.rightBuffer = rightBuffer;
			this.topBuffer = topBuffer;
			this.bottomBuffer = bottomBuffer;
		}
		A__setObjectScaleRatio(newScale, xFlip, yFlip)
		{
			this.scaleRatio = newScale;
			this.xFlip = xFlip;
			this.yFlip = yFlip;
			this.force = true;
		}

		A__setObjectXFlip(xFlip)
		{
			this.xFlip = xFlip;
			this.force = true;
		}

		A__setIgnoreGlobalTimeScale(ignore)
		{
			this.ignoreGlobalTimeScale = (ignore == 1);
		}

		A__findSpriterObject(c2Object)
		{
			if (this.currentAnimation)
			{
				var timelines = this.currentAnimation.timelines;
				for (var t = 0; t < timelines.length; t++)
				{
					var timeline = timelines[t];
					if (timeline && timeline.c2Object)
					{
						if (timeline.c2Object.inst == c2Object.GetFirstPicked())
						{
							this.lastFoundObject = timeline.name;
							return;
						}
					}
				}
			}
		}

		A__stopResumeSettingLayer(resume)
		{
			this.setLayersForSprites = resume == 1;
		}
		
		A__stopResumeSettingVisibilityForObjects(resume)
		{
			this.setVisibilityForObjects = resume == 1;
		}
		
		A__stopResumeSettingCollisionsForObjects(resume)
		{
			this.setCollisionsForObjects = resume == 1;
		}

		A__setObjectYFlip(yFlip)
		{
			this.yFlip = yFlip;
			this.force = true;
		}
		
		A__setC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
		{
			var c2instance = c2Object.GetSolStack()._current._instances;
			if (c2instance.length === 0 && c2Object.GetSolStack()._current._selectAll === true)
				c2instance = c2Object._instances;
			this.objectsToSet.push(this.C2ObjectToSpriterObjectInstruction(c2instance, spriterObjectName, propertiesToSet, false));
		}

		A__pinC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
		{
			var c2instance = c2Object.GetSolStack()._current._instances;
			if (c2instance.length === 0 && c2Object.GetSolStack()._current._selectAll === true)
				c2instance = c2Object._instances;
			this.objectsToSet.push(this.C2ObjectToSpriterObjectInstruction(c2instance, spriterObjectName, propertiesToSet, true));
		}

		A__unpinC2ObjectFromSpriterObject(c2Object, spriterObjectName)
		{
			var allObjs = spriterObjectName === "";
			for (var i = 0; i < this.objectsToSet.length; i++)
			{
				if (this.objectsToSet[i].c2Object[0].type === c2Object && (allObjs ? true : this.objectsToSet[i].objectName === spriterObjectName))
				{
					this.objectsToSet.splice(i, 1);
					i--;
				}
			}
		}

		A__unpinAllFromSpriterObject(spriterObjectName)
		{
			if (spriterObjectName === "")
			{
				this.objectsToSet = [];
			}
			else
			{
				for (var i = 0; i < this.objectsToSet.length; i++)
				{
					if (this.objectsToSet[i].objectName === spriterObjectName)
					{
						this.objectsToSet.splice(i, 1);
						i--;
					}
				}
			}
		}

		A__setAnimation(animName, startFrom, blendDuration)
		{
			this.setAnim(animName, startFrom, blendDuration);
		}

		A__setSecondAnim(animName)
		{
			this.secondAnimation = this.getAnimFromEntity(animName);
			if (this.secondAnimation === this.currentAnimation)
			{
				this.secondAnimation = null;
			}
		}
		A__stopSecondAnim(animName)
		{
			this.secondAnimation = null;
			this.animBlend = 0;
		}
		A__setAnimBlendRatio(newBlend)
		{
			this.animBlend = newBlend;
		}
		A__setEnt(entName, animName)
		{
			var newAnimName = animName;
			if (this.entity && this.currentAnimation && this.entity.name == entName && this.currentAnimation.name == animName)
			{
				return;
			}
			var newEntSet = false;

			if (this.currentAnimation && newAnimName === "")
			{
				newAnimName = this.currentAnimation.name;
			}
			var sameAnimName = false;
			if (newAnimName === this.currentAnimation.name)
			{
				sameAnimName = true;
			}
			if (entName !== "" && ((!this.entity) || entName != this.entity.name))
			{
				this.setEntTo(entName);
				newEntSet = true;
			}

			if (newAnimName !== "" && (newEntSet || !sameAnimName))
			{
				this.setAnimTo(newAnimName, true, true);
			}

		}

		A__playAnimTo(units, playTo)
		{
			if (units === 0) // keyframes
			{
				var mainKeys = this.currentAnimation.mainlineKeys;
				if (mainKeys)
				{
					var key = mainKeys[playTo];
					if (key)
					{
						this.playTo = key.time;
					}
					else
					{
						this.playTo = -1;
						return;
					}
				}
			}
			else if (units == 1) // milliseconds
			{
				this.playTo = playTo;
			}
			else if (units == 2) // ratio
			{
				this.playTo = playTo * this.currentAnimation.length;
			}
			if (this.playTo == this.currentSpriterTime)
			{
				this.playTo = -1;
				return;
			}
			var reverseFactor = 1;
			if (this.currentAnimation.looping == "true")
			{
				var forwardDistance = 0;
				var backwardDistance = 0;
				if (this.playTo > this.currentSpriterTime)
				{
					forwardDistance = this.playTo - this.currentSpriterTime;
					backwardDistance = (this.currentAnimation.length - this.playTo) + this.currentSpriterTime;
				}
				else
				{
					forwardDistance = this.playTo + (this.currentAnimation.length - this.currentSpriterTime);
					backwardDistance = this.currentSpriterTime - this.playTo;
				}
				if (backwardDistance < forwardDistance)
				{
					reverseFactor = -1;
				}
			}
			else
			{
				if (this.playTo < this.currentSpriterTime)
				{
					reverseFactor = -1;
				}
			}
			this.speedRatio = Math.abs(this.speedRatio) * reverseFactor;
			this.animPlaying = true;
			this.Tick2();
		}

		A__associateTypeWithName(type, name)
		{
			var c2ObjectArray = this.c2ObjectArray;
			var objectArray = this.objectArray;
			
			for (var o = 0, len = objectArray.length; o < len; o++)
			{
				var obj = objectArray[o];
				if (name == obj.name)
				{
					obj.fullTypeName = type.GetName();
					var c2Object = c2ObjectArray[o];
					c2Object.type = type;
					var iid = this.GetInstance().GetIID(); // get my IID
					
					var paired_inst = type.GetInstances()[iid];
					c2Object.inst = paired_inst;
			
					var animations = this.entity.animations;
					for (var a = 0, lenA = animations.length; a < lenA; a++)
					{
						var animation = animations[a];
						var timelines = animation.timelines;
						for (var t = 0, lenT = timelines.length; t < lenT; t++)
						{
							var timeline = timelines[t];
							if (name == timeline.name)
							{
								timeline.c2Object = c2Object;
							}
						}
					}
					break;
				}
			}
		}
		A__setAnimationLoop(loopOn)
		{
			var currentAnimation = this.currentAnimation;
			if (this.changeAnimTo)
			{
				currentAnimation = this.changeAnimTo;
			}
			if (currentAnimation)
			{
				if (loopOn === 0)
				{
					currentAnimation.looping = "false";
				}
				else if (loopOn == 1)
				{
					currentAnimation.looping = "true";
				}
			}
			else
			{
				if (loopOn === 0)
				{
					this.startingLoopType = "false";
				}
				else if (loopOn == 1)
				{
					this.startingLoopType = "true";
				}
			}
		}
		A__setAnimationTime(units, time)
		{
			this.resetEventChecksToTime(time);
			this.setAnimTime(units, time);
		}
		A__pauseAnimation()
		{
			this.animPlaying = false;
		}

		A__resumeAnimation()
		{
			if (this.animPlaying === false)
			{
				this.lastKnownTime = this.getNowTime();
			}
			this.animPlaying = true;
			var anim = this.currentAnimation;
			if (anim)
			{
				if (this.speedRatio > 0)
				{
					if (this.currentSpriterTime == anim.length)
					{
						this.currentSpriterTime = 0;
					}
				}
				else if (this.currentSpriterTime === 0)
				{
					this.currentSpriterTime = this.currentAnimation.length;
				}
			}
		}

		A__removeAllCharMaps()
		{
			var c2Objs = this.c2ObjectArray;
			for (var c = 0; c < c2Objs.length; c++)
			{
				var c2Obj = c2Objs[c];
				c2Obj.appliedMap = [];
			}
			this.Tick2(true);
		}

		A__appendCharMap(mapName)
		{
			var c2Objs = this.c2ObjectArray;
			var mapApplied = false;
			for (var c = 0; c < c2Objs.length; c++)
			{
				var c2Obj = c2Objs[c];
				if (c2Obj)
				{
					if (c2Obj.obj)
					{
						var charMap = c2Obj.obj.charMaps[mapName];
						if (charMap)
						{
							for (var m = 0; m < charMap.length; m++)
							{
								var map = charMap[m];
								if (map)
								{
									c2Obj.appliedMap[map.oldFrame] = map.newFrame;
									mapApplied = true;
								}
							}
						}
					}
				}
			}
			if(mapApplied)
			{
				this.appliedCharMaps.push(mapName);
				this.Tick2(true);
			}
		}
		
		A__removeCharMap(mapName)
		{
			var mapRemoved = false;
			for (var m = 0; m < this.appliedCharMaps.length; m++)
			{
				var map = this.appliedCharMaps[m];
				if(map == mapName)
				{
					this.appliedCharMaps.splice(m, 1);
					mapRemoved = true;
					break;
				}
			}
			if(!mapRemoved)
			{
				return;
			}
			var c2Objs = this.c2ObjectArray;
			for (var c = 0; c < c2Objs.length; c++)
			{
				var c2Obj = c2Objs[c];
				c2Obj.appliedMap = [];
			}
			this.Tick2(true);
			for (var i = 0; i < this.appliedCharMaps.length; i++)
			{
				var map = this.appliedCharMaps[m];
				var c2Objs = this.c2ObjectArray;
				for (var c = 0; c < c2Objs.length; c++)
				{
					var c2Obj = c2Objs[c];
					if (c2Obj)
					{
						if (c2Obj.obj)
						{
							var charMap = c2Obj.obj.charMaps[map];
							if (charMap)
							{
								for (var m = 0; m < charMap.length; m++)
								{
									var map = charMap[m];
									if (map)
									{
										c2Obj.appliedMap[map.oldFrame] = map.newFrame;
									}
								}
							}
						}
					}
				}
			}
			this.Tick2(true);
		}

		A__overrideObjectComponent(objectName, component, newValue)
		{
			var override = this.objectOverrides[objectName];
			if (typeof override === 'undefined')
			{
				this.objectOverrides[objectName] = {};
				override = this.objectOverrides[objectName];
			}
			override[component] = newValue;
		}

		A__overrideBonesWithIk(parentBoneName, childBoneName, targetX, targetY, additionalLength)
		{
			var override = this.boneIkOverrides[parentBoneName];
			if (typeof override === 'undefined')
			{
				this.boneIkOverrides[parentBoneName] = {};
				override = this.boneIkOverrides[parentBoneName];
			}
			override.targetX = targetX;
			override.targetY = targetY;
			override.childBone = childBoneName;
			override.additionalLength = additionalLength;
		}

		//////////////////////////////////////////
		// Condition Methods
		C__readyForSetup()
		{
			this._inst._objectType._SetIIDsStale();
			return true;
		}

		C__outsidePaddedViewport()
		{
			return this.isOutsideViewportBox();
		}

		C__actionPointExists (pointName)
		{
			var timeline = this.timelineFromName(pointName);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.x !== undefined)
				{
					return true;
				}
			}
			return false;
		}
		
		C__objectExists (pointName)
		{
			var timeline = this.timelineFromName(pointName);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.x !== undefined)
				{
					return true;
				}
			}
			return false;
		}

		C__tagActive (tagName, objectName)
		{
			var anim = this.currentAnimation;
			if (anim)
			{
				if (objectName&&objectName!="")
				{
					var line = this.timelineFromName(objectName);
					if (line)
					{
						return this.tagStatus(tagName, line.meta);
					}
				}
				else
				{
					return this.tagStatus(tagName, anim.meta);
				}
			}
			return false;
		}
		
		C__CompareCurrentKey (cmp, frame)
		{
			return DoCmp(this.currentFrame(), cmp, frame);
		}  
		
		C__CompareCurrentTime (cmp, time, format)
		{
			if (format === 0) //milliseconds
			{
				return DoCmp(this.currentSpriterTime, cmp, time);
			}
			else
			{
				var anim = this.currentAnimation;
				if (anim)
				{
					return DoCmp(this.currentSpriterTime / this.currentAnimation.length, cmp, time);
				}
				else
				{
					return false;
				}
			}
		}

		C__CompareAnimation (name)
		{
			var blendingTo = this.secondAnimation;
			if (blendingTo && blendingTo.name === name && this.blendEndTime > 0)
			{
				return true;
			}
			var anim = this.currentAnimation;
			if (anim && anim.name === name)
			{
				return true;
			}
			else
			{
				return false;
			}
		}

		C__CompareSecondAnimation (name)
		{
			if (this.secondAnimation)
			{
				return name === this.secondAnimation.name;
			}
			else
			{
				return false;
			}
		}

		C__CompareEntity (name)
		{
			var ent = this.entity;
			if (ent && ent.name === name)
			{
				return true;
			}
			else
			{
				return false;
			}
		}

		
		C__AnimationPaused()
		{
			return !this.animPlaying;
		}
		C__AnimationLooping()
		{
			var anim = this.currentAnimation;
			if (anim && anim.looping === "true")
			{
				return true;
			}
			else
			{
				return false;
			}
		}

		C__isMirrored()
		{
			return this.xFlip;
		}

		C__isFlipped()
		{
			return this.yFlip;
		}
		
		C__CompareZElevation(which, comparison, z_elevation)
		{
			// which:
			// 0 = Z Elevation   
			// 1 = Total Z Elevation
			if(which == 0)
			{
				DoCmp(this.GetWorldInfo().GetZElevation(), comparison, z_elevation);
			}
			else
			{
				DoCmp(this.GetWorldInfo().GetTotalZElevation(), comparison, z_elevation);
			}
		}

		//////////////////////////////////////////
		// Expression Methods
		E__time()
		{
			return this.currentSpriterTime;
		}
		

		E__val(varname, objectName)
		{
			var anim = this.currentAnimation;
			if (anim)
			{
				if (objectName)
				{
					var line = this.timelineFromName(objectName);
					if (line)
					{
						return this.varStatus(varname, line.meta);
						
					}
				}
				else
				{
					return this.varStatus(varname, anim.meta);					
				}
			}
			return 0;
		}
		E__pointX(name)
		{
			var timeline = this.timelineFromName(name);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.x !== undefined)
				{
					return timeline.currentObjectState.x;
					
				}
			}
			return 0;
		}

		E__pointY(name)
		{
			var timeline = this.timelineFromName(name);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.y !== undefined)
				{
					return timeline.currentObjectState.y;
					
				}
			}
			return 0;
		}

		E__pointAngle(name)
		{
			var timeline = this.timelineFromName(name);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.angle !== undefined)
				{
					return ToDegrees(timeline.currentObjectState.angle);
					
				}
			}
			return 0;
		}
		
		E__objectX(name)
		{
			var timeline = this.timelineFromName(name);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.x !== undefined)
				{
					return timeline.currentObjectState.x;
					
				}
			}
			return 0;
		}

		E__objectY(name)
		{
			var timeline = this.timelineFromName(name);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.y !== undefined)
				{
					return timeline.currentObjectState.y;
					
				}
			}
			return 0;
		}

		E__objectAngle(name)
		{
			var timeline = this.timelineFromName(name);
			if (timeline && timeline.currentObjectState)
			{
				if (timeline.currentObjectState.angle !== undefined)
				{
					return ToDegrees(timeline.currentObjectState.angle);
					
				}
			}
			return 0;
		}

		E__timeRatio()
		{
			if (this.currentAnimation)
			{
				return this.currentSpriterTime / this.currentAnimation.length;
			}
			else
			{
				return 0;
			}
		}

		E__ScaleRatio()
		{
			return this.scaleRatio;
		}

		E__key()
		{
			return this.currentFrame();
		}

		E__PlayTo()
		{
			return this.playTo;
		}

		E__animationName()
		{
			if (this.changeAnimTo)
			{
				return this.changeAnimTo.name;
			}
			//else if(this.currentAnimation)
			else if (this.currentAnimation)
			{
				return this.currentAnimation.name;
			}
			else
			{
				return "";
			}
		}

		E__animationLength()
		{
			if (this.currentAnimation)
			{
				return this.currentAnimation.length;
			}
			else
			{
				return 0;
			}
		}

		E__speedRatio()
		{
			return this.speedRatio;
		}

		E__secondAnimationName()
		{
			if (this.secondAnimation)
			{
				return this.secondAnimation.name;
			}
			else
			{
				return "";
			}
		}

		E__entityName()
		{
			if (this.entity)
			{
				return this.entity.name;
			}
			else
			{
				return "";
			}
		}

		E__PlayToTimeLeft()
		{
			if (this.playTo < 0)
			{
				return 0;
			}

			if (this.currentAnimation.looping == "true")
			{
				var forwardDistance = 0;
				var backwardDistance = 0;
				if (this.speedRatio >= 0)
				{
					if (this.playTo > this.currentSpriterTime)
					{
						return this.playTo - this.currentSpriterTime;
					}
					else
					{
						return this.playTo + (this.currentAnimation.length - this.currentSpriterTime);
					}
				}
				else
				{
					if (this.playTo > this.currentSpriterTime)
					{
						return (this.currentAnimation.length - this.playTo) + this.currentSpriterTime;
					}
					else
					{
						return this.currentSpriterTime - this.playTo;
					}
				}
			}
			else
			{
				return Math.abs(this.playTo - this.currentSpriterTime);
			}

		}
		E__triggeredSound()
		{
			return this.soundToTrigger;
		}

		E__triggeredSoundTag()
		{
			if (this.soundLineToTrigger)
			{
				return this.soundLineToTrigger.name;
				
			}
			//else
			return "";
		}

		E__soundVolume(soundTag)
		{
			var soundline = this.soundlineFromName(soundTag);
			if (soundline)
			{
				if (soundline.currentObjectState)
				{
					return soundline.currentObjectState.volume;
					
				}
			}
			return 0;
		}

		E__soundPanning(soundTag)
		{
			var soundline = this.soundlineFromName(soundTag);
			if (soundline)
			{
				if (soundline.currentObjectState)
				{
					return soundline.currentObjectState.panning;
					
				}
			}
			return 0;
		}

		E__blendRatio()
		{
			return this.animBlend;
		}

		E__Opacity()
		{
			return this.GetWorldInfo().GetOpacity() * 100.0;
		}

		E__BBoxLeft()
		{
			this.update_bbox();
			return this.bbox.left;
		}

		E__BBoxTop()
		{
			this.update_bbox();
			return this.bbox.top;
		}

		E__BBoxRight()
		{
			this.update_bbox();
			return this.bbox.right;
		}

		E__BBoxBottom()
		{
			this.update_bbox();
			return this.bbox.bottom;
		}

		E__foundObject()
		{
			return this.lastFoundObject;
		}

		E__ZElevation()
		{
			return this.GetWorldInfo().GetZElevation();
		}

		E__TotalZElevation()
		{
			return this.GetWorldInfo().GetTotalZElevation();
		}

		// Construct 3 Interface
		GetScriptInterfaceClass()
		{
			return self.ISpriterInstance;
		}
	};
	function SpriterObjectRef()
	{
		this.type = "reference";
		this.timeline = 0;
		this.key = 0;
		this.parent = -1;
	};

	function SpriterFolder()
	{
		this.files = [];
	};

	function VarDef()
	{
		this.name = "";
		this.type = "";
		this.def = "";
	};

	function TagLine()
	{
		this.keys = [];
		this.lastTagIndex = 0;
		this.currentTags = [];
	};
	function MetaData()
	{
		this.varlines = [];
		this.tagline = new TagLine();
	};
	function VarLine()
	{
		this.varDef = {};
		this.defIndex = 0;
		this.keys = [];
		this.lastTagIndex = 0;
		this.currentVal = 0;
	};

	function EventLine()
	{
		this.name = "";
		this.keys = [];
		this.meta = new MetaData();
	};

	function SpriterFile()
	{
		this.fileName = "";
		this.pivotX = 0;
		this.pivotY = 0;
		this.w = 1;
		this.h = 1;

		this.atlasX = 0;
		this.atlasY = 0;
		this.atlasXOff = 0;
		this.atlasYOff = 0;
		this.atlasW = 0;
		this.atlasH = 0;
		this.atlasRotated = false;
	};
	
	function ObjInfo()
	{
		this.name = "";
		this.varDefs = [];
	};

	function SpriterEntity()
	{
		this.name = "";
		this.animations = [];
		this.varDefs = [];
	};

	function SpriterAnimation()
	{
		this.name = "";
		this.length = 1;
		this.looping = "true";
		this.loopTo = 0;
		this.mainlineKeys = [];
		this.timelines = [];
		this.soundlines = [];
		this.eventlines = [];
		this.meta = new MetaData();
		this.cur_frame = 0;
		this.localTime = 0;
		this.l = -25;
		this.t = -25;
		this.r = 25;
		this.b = 25;
	};

	function SpriterTimeline()
	{
		this.keys = [];
		this.name = "";
		this.c2Object = 0;
		this.object = 0;
		this.objectType = "sprite";
		this.currentObjectState = {};
		this.currentMappedState = {};
		this.lastTimeSoundCheck = 0;
		this.meta = new MetaData();
	};

	function SpriterKey()
	{
		this.bones = [];
		this.objects = [];
		this.time = 0;
		this.spin = 1;
		this.curveType = "linear";
		this.c1 = 0;
		this.c2 = 0;
		this.c3 = 0;
		this.c4 = 0;
	};
	
	function TagKey()
	{
		this.tags = [];
		this.time = 0;
	};

	function VarKey()
	{
		this.val = 0;
		this.time = 0;
		this.spin = 1;
		this.curveType = "linear";
		this.c1 = 0;
		this.c2 = 0;
		this.c3 = 0;
		this.c4 = 0;
	};

	function SpriterObject()
	{
		this.type = "sprite";
		this.x = 0;
		this.y = 0;
		this.angle = 0;
		this.a = 1;
		this.xScale = 1;
		this.yScale = 1;
		this.pivotX = 0.0;
		this.pivotY = 0.0;
		this.entity = 0;
		this.animation = "";
		this.t = 0;
		this.defaultPivot = false;
		this.frame = 0;
		this.storedFrame = 0;
	};

	function SpriterSound()
	{
		this.type = "sound";
		this.name = "";
		this.trigger = true;
		this.panning = 0.0;
		this.volume = 1.0;
	};

	function EventKey()
	{
		this.time = 0;
	};
	
	function SpriterObjectArrayItem(spritername, name, entityName, originalName, varDefs)
	{
		this.name = name;
		this.fullTypeName = spritername + "_" + name;
		this.fullTypeName=this.fullTypeName.replace(/-/g,'');
		this.spriterType = "sprite";
		this.frames = [];
		this.pivots = [];
		this.imageSizes = [];
		this.atlasInfos = [];
		this.charMaps = [];
		this.width = 0;
		this.height = 0;
		this.entityName = entityName;
		this.originalName = originalName;
		this.varDefs = varDefs;
		//charmap=[]
		//charmap.old=framenumber
		//charmap.new=framenumber

		//apply charmap
		//timeline.appliedmap[charmap.old]=charmap.new;
		//
	};

	// Script interface. Use a WeakMap to safely hide the internal implementation details from the
	// caller using the script interface.
	const map = new WeakMap();
	
	self.ISpriterInstance = class ISpriterInstance extends self.IWorldInstance {
		constructor()
		{
			super();
			
			// Map by SDK instance
			map.set(this, self.IInstance._GetInitInst().GetSdkInstance());
		}

		//////////////////////////////////////////
		// Globals
		get Context()
		{
			return map.get(this);
		}

		//////////////////////////////////////////
		// Actions
		setPlaybackSpeedRatio(newSpeed)
		{
			map.get(this).A__setPlaybackSpeedRatio(newSpeed);
		}
		
		setVisible(visible)
		{
			map.get(this).A__setVisible(visible);
		}
		setOpacity(newOpacity)
		{
			map.get(this).A__setOpacity(newOpacity)
		}
		setAutomaticPausing(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer)
		{
			map.get(this).A__setAutomaticPausing(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer);
		}
		setObjectScaleRatio(newScale, xFlip, yFlip)
		{
			map.get(this).A__setObjectScaleRatio(newScale, xFlip, yFlip);
		}
		
		setObjectXFlip(xFlip)
		{
			map.get(this).A__setObjectXFlip(xFlip);
		}
		
		setIgnoreGlobalTimeScale(ignore)
		{
			map.get(this).A__setIgnoreGlobalTimeScale(ignore);
		}
		
		findSpriterObject(c2Object)
		{
			map.get(this).A__findSpriterObject(c2Object);
		}
		
		stopResumeSettingLayer(resume)
		{
			map.get(this).A__stopResumeSettingLayer(resume);
		}
		
		stopResumeSettingVisibilityForObjects(resume)
		{
			map.get(this).A__stopResumeSettingVisibilityForObjects(resume);
		}
		
		stopResumeSettingCollisionsForObjects(resume)
		{
			map.get(this).A__stopResumeSettingCollisionsForObjects(resume);
		}
		
		setObjectYFlip(yFlip)
		{
			map.get(this).A__setObjectYFlip(yFlip);
		}
		
		setC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
		{
			map.get(this).A__setC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName);
		}
		
		pinC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
		{
			map.get(this).A__pinC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName);
		}
		
		unpinC2ObjectFromSpriterObject(c2Object, spriterObjectName)
		{
			map.get(this).A__unpinC2ObjectFromSpriterObject(c2Object, spriterObjectName);
		}
		
		unpinAllFromSpriterObject(spriterObjectName)
		{
			map.get(this).A__unpinAllFromSpriterObject(spriterObjectName);
		}
		
		setAnimation(animName, startFrom, blendDuration)
		{
			map.get(this).A__setAnimation(animName, startFrom, blendDuration);
		}
		
		setSecondAnim(animName)
		{
			map.get(this).A__setSecondAnim(animName);
		}
		stopSecondAnim(animName)
		{
			map.get(this).A__stopSecondAnim(animName);
		}
		setAnimBlendRatio(newBlend)
		{
			map.get(this).A__setAnimBlendRatio(newBlend);
		}
		setEnt(entName, animName)
		{
			map.get(this).A__setEnt(entName, animName);
		}
		
		playAnimTo(units, playTo)
		{
			map.get(this).A__playAnimTo(units, playTo);
		}
		
		associateTypeWithName(type, name)
		{
			map.get(this).A__associateTypeWithName(type, name);
		}
		setAnimationLoop(loopOn)
		{
			map.get(this).A__setAnimationLoop(loopOn);
		}
		setAnimationTime(units, time)
		{
			map.get(this).A__setAnimationTime(units, time);
		}
		pauseAnimation()
		{
			map.get(this).A__pauseAnimation();
		}
		
		resumeAnimation()
		{
			map.get(this).A__resumeAnimation();
		}
		
		removeAllCharMaps()
		{
			map.get(this).A__removeAllCharMaps();
		}
		
		appendCharMap(mapName)
		{
			map.get(this).A__appendCharMap(mapName);
		}
		
		removeCharMap(mapName)
		{
			map.get(this).A__removeCharMap(mapName);
		}
		
		overrideObjectComponent(objectName, component, newValue)
		{
			map.get(this).A__overrideObjectComponent(objectName, component, newValue);
		}
		
		overrideBonesWithIk(parentBoneName, childBoneName, targetX, targetY, additionalLength)
		{
			map.get(this).A__overrideBonesWithIk(parentBoneName, childBoneName, targetX, targetY, additionalLength);
		}

		//////////////////////////////////////////
		// Conditions
		readyForSetup()
		{
			return map.get(this).C__readyForSetup();
		}
		
		outsidePaddedViewport()
		{
			return map.get(this).C__outsidePaddedViewport();
		}
		
		actionPointExists (pointName)
		{
			return map.get(this).C__actionPointExists(pointName);
		}
		
		objectExists (pointName)
		{
			return map.get(this).C__objectExists(pointName);
		}
		
		tagActive (tagName, objectName)
		{
			return map.get(this).C__tagActive(tagName, objectName);
		}
		
		CompareCurrentKey (cmp, frame)
		{
			return map.get(this).C__CompareCurrentKey(cmp, frame);
		}     
		
		CompareCurrentTime (cmp, time, format)
		{
			return map.get(this).C__CompareCurrentTime (cmp, time, format);
		}
		
		CompareAnimation (name)
		{
			return map.get(this).C__CompareAnimation(name);
		}
		
		CompareSecondAnimation (name)
		{
			return map.get(this).C__CompareSecondAnimation(name);
		}
		
		CompareEntity (name)
		{
			return map.get(this).C__CompareEntity(name);
		}
		
		AnimationPaused()
		{
			return map.get(this).C__AnimationPaused();
		}
		
		AnimationLooping()
		{
			return map.get(this).C__AnimationLooping();
		}
		
		isMirrored()
		{
			return map.get(this).C__isMirrored();
		}
		
		isFlipped()
		{
			return map.get(this).C__isFlipped();
		}
		
		CompareZElevation(which, comparison, z_elevation)
		{
			return map.get(this).C__CompareZElevation(which, comparison, z_elevation);
		}

		//////////////////////////////////////////
		// Expressions
		time()
		{
			return map.get(this).E__time();
		}
		
		val(varname, objectName)
		{
			return map.get(this).E__val(varname, objectName);
		}
		pointX(name)
		{
			return map.get(this).E__pointX(name);
		}
		
		pointY(name)
		{
			return map.get(this).E__pointY(name);
		}
		
		pointAngle(name)
		{
			return map.get(this).E__pointAngle(name);
		}
		
		objectX(name)
		{
			return map.get(this).E__objectX(name);
		}
		
		objectY(name)
		{
			return map.get(this).E__objectY(name);
		}
		
		objectAngle(name)
		{
			return map.get(this).E__objectAngle(name);
		}
		
		timeRatio()
		{
			return map.get(this).E__timeRatio();
		}
		
		ScaleRatio()
		{
			return map.get(this).E__ScaleRatio();
		}
		
		key()
		{
			return map.get(this).E__key();
		}
		
		PlayTo()
		{
			return map.get(this).E__PlayTo();
		}
		
		animationName()
		{
			return map.get(this).E__animationName();
		}
		
		animationLength()
		{
			return map.get(this).E__animationLength();
		}
		
		speedRatio()
		{
			return map.get(this).E__speedRatio();
		}
		
		secondAnimationName()
		{
			return map.get(this).E__secondAnimationName();
		}
		
		entityName()
		{
			return map.get(this).E__entityName();
		}
		
		PlayToTimeLeft()
		{
			return map.get(this).E__PlayToTimeLeft();
		}
		triggeredSound()
		{
			return map.get(this).E__triggeredSound();
		}
		
		triggeredSoundTag()
		{
			return map.get(this).E__triggeredSoundTag();
		}
		
		soundVolume(soundTag)
		{
			return map.get(this).E__soundVolume(soundTag);
		}
		
		soundPanning(soundTag)
		{
			return map.get(this).E__soundPanning(soundTag);
		}
		
		blendRatio()
		{
			return map.get(this).E__blendRatio();
		}
		
		Opacity()
		{
			return map.get(this).E__Opacity();
		}
		
		BBoxLeft()
		{
			return map.get(this).E__BBoxLeft();
		}
		
		BBoxTop()
		{
			return map.get(this).E__BBoxTop();
		}
		
		BBoxRight()
		{
			return map.get(this).E__BBoxRight();
		}
		
		BBoxBottom()
		{
			return map.get(this).E__BBoxBottom();
		}
		
		foundObject()
		{
			return map.get(this).E__foundObject();
		}
		
		ZElevation()
		{
			return map.get(this).E__ZElevation();
		}
		
		TotalZElevation()
		{
			return map.get(this).E__TotalZElevation();
		}
	};
}