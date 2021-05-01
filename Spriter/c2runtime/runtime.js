// ECMAScript 5 strict mode
"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

/////////////////////////////////////
// Plugin class
cr.plugins_.Spriter = function(runtime)
{
	this.runtime = runtime;
};

(function()
{
	var pluginProto = cr.plugins_.Spriter.prototype;

	/////////////////////////////////////
	// Object type class
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var typeProto = pluginProto.Type.prototype;

	function frame_getDataUri()
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

	typeProto.onCreate = function()
	{
		this.doGetFromPreload = false;
		this.scmlFiles = {};
		this.scmlReserved = {};
		this.scmlInstsToNotify = {};
		this.objectArrays = [];
		this.boneWidthArrays = [];

		this.sheetTex = {};

		// load singular spritesheet image
		if (this.is_family)
			return;

		var i, leni, j, lenj;
		var anim, frame, animobj, frameobj, wt, uv;

		this.all_frames = [];
		this.has_loaded_textures = false;

		// Load all animation frames
		if (this.animations)
		{
			for (i = 0, leni = this.animations.length; i < leni; i++)
			{
				anim = this.animations[i];
				animobj = {};
				animobj.name = anim[0];
				animobj.speed = anim[1];
				animobj.loop = anim[2];
				animobj.repeatcount = anim[3];
				animobj.repeatto = anim[4];
				animobj.pingpong = anim[5];
				animobj.sid = anim[6];
				animobj.frames = [];

				for (j = 0, lenj = anim[7].length; j < lenj; j++)
				{
					frame = anim[7][j];
					frameobj = {};
					frameobj.texture_file = frame[0];
					frameobj.texture_filesize = frame[1];
					frameobj.offx = frame[2];
					frameobj.offy = frame[3];
					frameobj.width = frame[4];
					frameobj.height = frame[5];
					frameobj.duration = frame[6];
					frameobj.hotspotX = frame[7];
					frameobj.hotspotY = frame[8];
					frameobj.image_points = frame[9];
					frameobj.poly_pts = frame[10];
					frameobj.pixelformat = frame[11];
					frameobj.spritesheeted = (frameobj.width !== 0);
					frameobj.datauri = ""; // generated on demand and cached
					frameobj.getDataUri = frame_getDataUri;

					uv = {};
					uv.left = 0;
					uv.top = 0;
					uv.right = 1;
					uv.bottom = 1;
					frameobj.sheetTex = uv;

					this.sheetTex = uv;

					frameobj.webGL_texture = null;

					// Sprite sheets may mean multiple frames reference one image
					// Ensure image is not created in duplicate
					wt = this.runtime.findWaitingTexture(frame[0]);

					if (wt)
					{
						frameobj.texture_img = wt;
					}
					else
					{
						frameobj.texture_img = new Image();
						frameobj.texture_img.cr_src = frame[0];
						frameobj.texture_img.cr_filesize = frame[1];
						frameobj.texture_img.c2webGL_texture = null;

						// Tell runtime to wait on this texture
						this.runtime.waitForImageLoad(frameobj.texture_img, frame[0]);
					}

					cr.seal(frameobj);
					animobj.frames.push(frameobj);
					this.all_frames.push(frameobj);
				}

				cr.seal(animobj);
				this.animations[i] = animobj; // swap array data for object
			}
		}
	};

	/////////////////////////////////////
	// Instance class

	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;

		this.lastData = "";
		this.progress = 0;

		this.entity = 0;
		this.entities = [];

		this.currentSpriterTime = 0;
		this.currentAdjustedTime = 0;
		this.secondTime = 0;

		this.start_time = cr.performance_now();
		this.lastKnownTime = this.getNowTime();

		this.drawSelf = false;
		this.ignoreGlobalTimeScale = false;
	};

	var instanceProto = pluginProto.Instance.prototype;
	instanceProto.setEntitiesToOtherEntities = function(otherEntities)
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
										var object = CloneObject(objectTag);
										key.objects.push(object);
									}
								}
								var boneTags = keyTag.bones;
								if (boneTags)
								{
									for (var o = 0; o < boneTags.length; o++)
									{
										var boneTag = boneTags[o];
										var bone = CloneObject(boneTag);
										key.bones.push(bone);
									}
								}
								timeline.keys.push(key);
							}
						}
						timeline.c2Object = this.c2ObjectArray[findObjectItemInArray(timelineName, this.objectArray, entity.name)];
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
	instanceProto.forceCharacterFromPreload = function()
	{
		this.getCharacterFromPreload();
	}

	instanceProto.getCharacterFromPreload = function()
	{
		if (this.type.scmlFiles.hasOwnProperty(this.properties[0]))
		{
			//if(!this.type.scmlReserved.hasOwnProperty(this.properties[0]))
			{
				this.setEntitiesToOtherEntities(this.type.scmlFiles[this.properties[0]]);
				if (this.type.objectArrays.hasOwnProperty(this.properties[0]))
				{
					this.objectArray = this.type.objectArrays[this.properties[0]];
					this.boneWidthArray = this.type.boneWidthArrays[this.properties[0]];
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
					this.currentAnimation.looping = startingLoopType;
				}
				this.doGetFromPreload = true;
				//this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.readyForSetup, this);
			}
			return true;
		}
		else if (this.type.scmlReserved.hasOwnProperty(this.properties[0]))
		{
			if (!this.type.scmlInstsToNotify[this.properties[0]])
			{
				this.type.scmlInstsToNotify[this.properties[0]] = [];
			}
			if(!this in this.type.scmlInstsToNotify[this.properties[0]])
			{
				this.type.scmlInstsToNotify[this.properties[0]].push(this);
			}
			return true;
		}
		return false;
	}
	var PAUSENEVER = 0;
	var PAUSEALLOUTSIDEBUFFER = 1;
	var PAUSEALLBUTSOUNDOUTSIDEBUFFER = 2;

	var COMPONENTANGLE = '0';
	var COMPONENTX = '1';
	var COMPONENTY = '2';
	var COMPONENTSCALEX = '3';
	var COMPONENTSCALEY = '4';
	var COMPONENTIMAGE = '5';
	var COMPONENTPIVOTX = '6';
	var COMPONENTPIVOTY = '7';
	var COMPONENTENTITY = '8';
	var COMPONENTANIMATION = '9';
	var COMPONENTTIMERATIO = '10';

	instanceProto.onCreate = function()
	{
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

		this.scaleRatio = this.width / 50.0;
		this.subEntScaleX = 1.0;
		this.subEntScaleY = 1.0;
		this.xFlip = false;
		this.yFlip = false;
		this.playTo = -1;
		this.changeToStartFrom = 0;
		this.runtime.tickMe(this);
		this.runtime.tick2Me(this);
		this.startingEntName = null;
		this.startingAnimName = null;
		this.startingLoopType = null;

		this.leftBuffer = 0;
		this.rightBuffer = 0;
		this.topBuffer = 0;
		this.bottomBuffer = 0;
		this.pauseWhenOutsideBuffer = PAUSENEVER;

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
		if ((!this.getCharacterFromPreload()) && this.properties[0].length > 0)
		{
			var self = this;
			var request = null;

			var doErrorFunc = function() {};

			var errorFunc = function() {};

			var progressFunc = function(e) {};

			this.type.scmlReserved[this.properties[0]] = this;
			if(this.runtime.isWKWebView)
			{
				this.runtime.fetchLocalFileViaCordovaAsText(this.runtime.getLocalFileUrl(this.properties[0]),
				function (str)
				{
					self.ProcessRawTextFile(str);
				},
				function (err)
				{	
					console.log(err);
				});
			}
			else
			{
				request = new XMLHttpRequest();
			
				request.onreadystatechange = function()
				{
					// Note: node-webkit leaves status as 0 for local AJAX requests, presumably because
					// they are local requests and don't have a HTTP response.  So interpret 0 as success
					// in this case.

					if (request.readyState === 4 && !self.isDestroyed)
					{
						if (request.status >= 400)
						{
							log("[Construct 2] scml object(" + self.type.name + "): XMLHttpRequest failed with request status " + request.status + "when attempting to retrieve " + self.properties[0], "warn");
						}
						else
						{
							self.ProcessRawTextFile(request.responseText);
						}
					}
				};
				
				request.onerror = errorFunc;
				request.ontimeout = errorFunc;
				request.onabort = errorFunc;
				request["onprogress"] = progressFunc;

				request.open("GET", this.runtime.getLocalFileUrl(this.properties[0]));
				request.send();
			}
		}

		this.force = false;
		this.inAnimTrigger = false;
		this.changeAnimTo = null;
		this.opacity = clamp(0.0, 1.0, this.properties[3] / 100.0);

		if (this.drawSelf)
		{
			var frame = this.type.animations[0].frames[0];
			var maintex = frame.texture_img;
			var uv = frame.sheetTex;
			uv.left = frame.offx / maintex.width;
			uv.top = frame.offy / maintex.height;
			uv.right = (frame.offx + frame.width) / maintex.width;
			uv.bottom = (frame.offy + frame.height) / maintex.height;
		}
	};

	instanceProto.ProcessRawTextFile = function(text)
	{
		text.replace(/\r\n/g, "\n"); // fix windows style line endings
		this.doRequest(JSON.parse(text));
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
	
	instanceProto.onDestroy = function()
	{
		this.isDestroyed = true;
	};

	instanceProto.getVarDefsByName = function(objName)
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
	instanceProto.getVarDefByName = function(objName, varName)
	{
		var objInf = this.getVarDefsByName(objName);
		if (objInf)
		{
			for (var v = 0; v < objInfo.varDefs.length; v++)
			{
				var varDef = objInfo.varDefs[v];
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

	function ObjInfo()
	{
		this.name = "";
		this.varDefs = [];
	}

	function SpriterEntity()
	{
		this.name = "";
		this.animations = [];
		this.varDefs = [];
	}

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
	}

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
	}

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
	}

	function C2ObjectToSpriterObjectInstruction(initialC2Object, spriterObjectName, propertiesToSet, pin)
	{
		this.c2Object = Array.from(initialC2Object);
		this.objectName = spriterObjectName;
		this.setType = propertiesToSet;
		// 0 = angle and position
		// 1 = angle
		// 2 = position
		this.pin = pin;
	}

	function clamp(low, high, val)
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

	function setTimeInfoFromJson(json, targetKey)
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
	instanceProto.setTimelinesFromJson = function(json, timelines, entity)
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

						setTimeInfoFromJson(keyTag, key);
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
				timeline.c2Object = this.c2ObjectArray[findObjectItemInArray(timelineName, this.objectArray, entity.name)];

				var obj = objectFromArray(timelineName, this.objectArray, entity.name);
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
	instanceProto.setSoundlinesFromJson = function(json, timelines, entityname)
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

						setTimeInfoFromJson(keyTag, key);
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
				var obj = objectFromArray(timeline.name, this.objectArray, entityname);

				this.setMetaDataFromJson(timelineTag["meta"], timeline.meta, this.getVarDefsByName(timeline.name));
				timelines.push(timeline);
			}
		}
	}
	instanceProto.setVarlinesFromJson = function(json, timelines, vardefs)
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
						setTimeInfoFromJson(keyTag, key);
						key.val = keyTag["val"];
						timeline.keys.push(key);
					}
				}
				timelines.push(timeline);
			}
		}
	}
	instanceProto.setEventlinesFromJson = function(json, timelines, entityname)
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
						setTimeInfoFromJson(keyTag, key);
						timeline.keys.push(key);
					}
				}

				this.setMetaDataFromJson(timelineTag["meta"], timeline.meta, this.getVarDefsByName(timeline.name));

				timelines.push(timeline);
			}
		}
	}
	instanceProto.setTaglinesFromJson = function(json, timeline)
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
					setTimeInfoFromJson(keyTag, key);
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
	instanceProto.setMetaDataFromJson = function(json, meta, vardefs)
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

	function TagKey()
	{
		this.tags = [];
		this.time = 0;
	}

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
	}

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
	}

	function SpriterSound()
	{
		this.type = "sound";
		this.name = "";
		this.trigger = true;
		this.panning = 0.0;
		this.volume = 1.0;
	}

	function EventKey()
	{
		this.time = 0;
	}

	function CloneObject(other)
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

	function sampleCurve(a, b, c, t)
	{
		return ((a * t + b) * t + c) * t;
	}

	function sampleCurveDerivativeX(ax, bx, cx, t)
		{
			return (3.0 * ax * t + 2.0 * bx) * t + cx;
		}
		// The epsilon value to pass given that the animation is going to run over |dur| seconds. The longer the
		// animation, the more precision is needed in the timing function result to avoid ugly discontinuities.
	function solveEpsilon(duration)
	{
		return 1.0 / (200.0 * duration);
	}

	function solve(ax, bx, cx, ay, by, cy, x, epsilon)
		{
			return sampleCurve(ay, by, cy, solveCurveX(ax, bx, cx, x, epsilon));
		}
		// Given an x value, find a parametric value it came from.
	function fabs(n)
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

	function solveCurveX(ax, bx, cx, x, epsilon)
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
			x2 = sampleCurve(ax, bx, cx, t2) - x;
			if (fabs(x2) < epsilon)
			{
				return t2;
			}
			d2 = sampleCurveDerivativeX(ax, bx, cx, t2);
			if (fabs(d2) < 1e-6)
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
			x2 = sampleCurve(ax, bx, cx, t2);
			if (fabs(x2 - x) < epsilon)
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
	function CubicBezierAtTime(t, p1x, p1y, p2x, p2y, duration)
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
		return solve(ax, bx, cx, ay, by, cy, t, solveEpsilon(duration));
	}

	function getT(a, b, x)
	{
		if (a === b)
		{
			return 0;
		}
		//else
		return (x - a) / (b - a);
	}

	function qerp(a, b, c, t)
	{
		return cr.lerp(cr.lerp(a, b, t), cr.lerp(b, c, t), t);
	}

	function cerp(a, b, c, d, t)
	{
		return cr.lerp(qerp(a, b, c, t), qerp(b, c, d, t), t);
	}

	function quartic(a, b, c, d, e, t)
	{
		return cr.lerp(cerp(a, b, c, d, t), cerp(b, c, d, e, t), t);
	}

	function quintic(a, b, c, d, e, f, t)
	{
		return cr.lerp(quartic(a, b, c, d, e, t), quartic(b, c, d, e, f, t), t);
	}

	function trueT(key, t)
	{
		switch (key.curveType)
		{
			case "linear":
				return t;
			case "quadratic":
				return qerp(0, key.c1, 1, t);
			case "cubic":
				return cerp(0, key.c1, key.c2, 1, t);
			case "quartic":
				return quartic(0, key.c1, key.c2, key.c3, 1, t);
			case "quintic":
				return quintic(0, key.c1, key.c2, key.c3, key.c4, 1, t);
			case "bezier":
				return CubicBezierAtTime(t, key.c1, key.c2, key.c3, key.c4, 1.0);
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

	function TweenedSpriterObject(a, b, t, spin, wFactor, hFactor)
	{
		wFactor = typeof wFactor !== 'undefined' ? wFactor : 1;
		hFactor = typeof hFactor !== 'undefined' ? hFactor : 1;
		var newObj = new SpriterObject();
		newObj.type = a.type;
		newObj.x = cr.lerp(a.x, b.x, t);
		newObj.y = cr.lerp(a.y, b.y, t);
		newObj.angle = anglelerp2(a.angle, b.angle, t, spin);
		newObj.a = cr.lerp(a.a, b.a, t);
		newObj.xScale = cr.lerp(a.xScale, b.xScale, t);
		newObj.yScale = cr.lerp(a.yScale, b.yScale, t);
		newObj.pivotX = a.pivotX; //cr.lerp(a.pivotX,b.pivotX,t);
		newObj.pivotY = a.pivotY; //cr.lerp(a.pivotY,b.pivotY,t);
		newObj.defaultPivot = a.defaultPivot;
		newObj.frame = a.frame;
		newObj.entity = a.entity;
		newObj.animation = a.animation;
		newObj.t = cr.lerp(a.t, b.t, t);
		newObj.storedFrame = a.storedFrame;
		return newObj;
	}

	function TweenedSpriterSound(a, b, t)
	{
		var newSound = new SpriterSound();
		newSound.trigger = a.trigger;
		newSound.volume = cr.lerp(a.volume, b.volume, t);
		newSound.panning = cr.lerp(a.panning, b.panning, t);
		newSound.name = a.name;
		return newSound;
	}

	function SpriterObjectRef()
	{
		this.type = "reference";
		this.timeline = 0;
		this.key = 0;
		this.parent = -1;
	}

	function SpriterFolder()
	{
		this.files = [];
	}

	function VarDef()
	{
		this.name = "";
		this.type = "";
		this.def = "";
	}

	function TagLine()
	{
		this.keys = [];
		this.lastTagIndex = 0;
		this.currentTags = [];
	}

	function MetaData()
	{
		this.varlines = [];
		this.tagline = new TagLine();
	}

	function VarLine()
	{
		this.varDef = {};
		this.defIndex = 0;
		this.keys = [];
		this.lastTagIndex = 0;
		this.currentVal = 0;
	}

	function EventLine()
	{
		this.name = "";
		this.keys = [];
		this.meta = new MetaData();
	}

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
	}

	function SetSpriteAnimFrame(sprite, framenumber, c2Object)
	{
		if (c2Object && c2Object.appliedMap[framenumber] !== undefined)
		{
			if (c2Object.appliedMap[framenumber] === -1)
			{
				if (sprite)
				{
					sprite.visible = false;
				}
				framenumber = -1;
			}
			else
			{
				framenumber = c2Object.appliedMap[framenumber];
			}
		}
		if (sprite)
		{
			sprite.changeAnimFrame = framenumber;

			// start ticking if not already
			if (!sprite.isTicking)
			{
				sprite.runtime.tickMe(sprite);
				sprite.isTicking = true;
			}

			// not in trigger: apply immediately
			if (!sprite.inAnimTrigger)
			{
				sprite.doChangeAnimFrame();
			}
		}

		return framenumber;
	}

	function anglelerp(a, b, x)
	{
		//a = cr.to_radians(a);
		//b = cr.to_radians(b);
		var diff = cr.angleDiff(a, b);

		// b clockwise from a
		if (cr.angleClockwise(b, a))
		{
			return (a + diff * x);
		}
		// b anticlockwise from a
		else
		{
			return (a - diff * x);
		}
	}

	function anglelerp2(a, b, x, spin)
	{
		//a = cr.to_radians(a);
		//b = cr.to_radians(b);
		if (spin === 0)
		{
			return a;
		}
		var diff = cr.angleDiff(a, b);

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

	function findInArray(item, arr)
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
	instanceProto.isOutsideViewportBox = function()
	{
		var layer = (this.layer);
		if (layer)
		{
			if (this.x < layer.viewLeft - this.leftBuffer)
			{
				return true;
			}
			if (this.x > layer.viewRight + this.rightBuffer)
			{
				return true;
			}
			if (this.y < layer.viewTop - this.topBuffer)
			{
				return true;
			}
			if (this.y > layer.viewBottom + this.bottomBuffer)
			{
				return true;
			}
		}
		return false;
	}
	instanceProto.MoveToLayer = function(inst, layerMove)
	{
		// no layer or same layer: don't do anything
		if (!layerMove || layerMove == inst.layer)
		{
			return;
		}

		// otherwise remove from current layer...
		cr.arrayRemove(inst.layer.instances, inst.get_zindex());
		inst.layer.setZIndicesStaleFrom(0);

		// ...and add to the top of the new layer (which can be done without making zindices stale)
		inst.layer = layerMove;
		inst.zindex = layerMove.instances.length;
		layerMove.instances.push(inst);

		inst.runtime.redraw = true;
	};

	instanceProto.animationFinish = function(reverse)
	{
		this.animTriggerName = this.currentAnimation.name;
		var animTrigger = this.inAnimTrigger;
		if (this.inAnimTrigger === false)
		{
			this.inAnimTrigger = true;
			this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnAnyAnimFinished, this);
			this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnAnimFinished, this);
			this.inAnimTrigger = false;
		}
	};

	instanceProto.clearAnimationState = function()
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

	instanceProto.getNowTime = function()
	{
		return (cr.performance_now() - this.start_time) / 1000.0;
	};

	instanceProto.doAnimChange = function()
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
			
			this.width = (this.currentAnimation.r - this.currentAnimation.l) * this.scaleRatio;
			this.height = (this.currentAnimation.b - this.currentAnimation.t) * this.scaleRatio;
			this.hotspotX = -(this.xFlip ? (-this.currentAnimation.r) : this.currentAnimation.l) / this.width * this.scaleRatio;
			this.hotspotY = -(this.yFlip ? (-this.currentAnimation.b) : this.currentAnimation.t) / this.height * this.scaleRatio;
			this.set_bbox_changed();

			this.currentAdjustedTime = this.currentSpriterTime;
			this.resetEventChecksToCurrentTime();
		}
	};
	instanceProto.endBlendAndSwap = function()
	{
		if (this.secondAnimation)
		{
			this.blendEndTime = 0;
			this.blendStartTime = 0;
			this.animBlend = 0;
			this.blendPoseTime = 0;
			if (this.changeToStartFrom === BLENDTOSTART)
			{
				this.currentSpriterTime = 0;
			}
			this.currentSpriterTime = this.secondAnimation.localTime; //cr.lerp(0,this.secondAnimation.length,getT(0,this.currentAnimation.length,this.currentSpriterTime));
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
	instanceProto.tickCurrentAnimationTime = function()
	{
		var lastKnownTime = this.lastKnownTime;
		var nowTime = this.getNowTime();
		this.lastKnownTime = nowTime;
		var lastSpriterTime = this.currentSpriterTime;
		var cur_timescale = this.ignoreGlobalTimeScale ? 1 : this.runtime.timescale;
		var animation = this.currentAnimation;

		// Apply object's own time scale if any
		if (this.my_timescale !== -1.0)
		{
			cur_timescale = this.my_timescale;
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
					if (this.changeToStartFrom === BLENDTOSTART && this.secondAnimation && this.blendEndTime > 0)
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
						if (this.changeToStartFrom === BLENDTOSTART && this.secondAnimation && this.blendEndTime > 0)
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
			if (this.changeToStartFrom === BLENDTOSTART)
			{
				this.secondAnimation.localTime = 0;
			}
			else
			{
				this.secondAnimation.localTime = cr.lerp(0, this.secondAnimation.length, getT(0, this.currentAnimation.length, this.currentSpriterTime));
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
				this.animBlend = getT(this.blendStartTime, blendEndTime, this.lastKnownTime);
			}
		}
		return animFinished;
	};

	instanceProto.setMainlineKeyByTime = function(animation)
	{
		animation = (typeof animation !== 'undefined') ? animation : this.currentAnimation;
		//var animation=this.currentAnimation;
		if (animation)
		{
			var currentTime = 0;
			if (animation === this.currentAnimation)
			{
				if (this.changeToStartFrom === BLENDTOSTART)
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
					var t = getT(firstTime, secondTime, this.currentSpriterTime);
					this.currentAdjustedTime = cr.lerp(firstTime, secondTime, trueT(mainKey, t));
				}
				else
				{
					var t = getT(firstTime, secondTime, animation.localTime);
					if (this.changeToStartFrom === BLENDTOSTART)
					{
						animation.localTime = 0;
					}
					else
					{
						animation.localTime = cr.lerp(firstTime, secondTime, trueT(mainKey, t));
					}
				}
			}

		}
	};
	instanceProto.doSecondAnimation = function()
	{
		return this.animBlend !== 0 && this.secondAnimation;
	}

	function shortestSpin(a, b)
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
	instanceProto.tweenBone = function(bone, tweenedBones, animation, bones, currentIndex, currentTime, nextTime, key)
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
				t = trueT(refKey, t);

				tweenedBones[currentIndex] = TweenedSpriterObject(bone, nextBone, t, refKey.spin);
			}
			else
			{
				tweenedBones[currentIndex] = CloneObject(bone);
			}
			refTimeline.currentMappedState = CloneObject(tweenedBones[currentIndex]);

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
							tweenedBones[currentIndex] = TweenedSpriterObject(firstBone, secondBone, this.animBlend, shortestSpin(firstBone.angle, secondBone.angle));
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

			var overrideComponents = this.objectOverrides[timelineName];
			if (typeof overrideComponents !== "undefined")
			{
				for (var component in overrideComponents)
				{
					switch (component)
					{
						case COMPONENTANGLE:
							tweenedBones[currentIndex].angle = cr.to_radians(overrideComponents[component]);
							this.force = true;
							break;
						case COMPONENTX:
							tweenedBones[currentIndex].x = overrideComponents[component];
							this.force = true;
							break;
						case COMPONENTY:
							tweenedBones[currentIndex].y = overrideComponents[component];
							this.force = true;
							break;
						case COMPONENTSCALEX:
							tweenedBones[currentIndex].xScale = overrideComponents[component];
							this.force = true;
							break;
						case COMPONENTSCALEY:
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
						this.tweenBone(childBone, tweenedBones, animation, bones, i, currentTime, nextTime, key);
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
			refTimeline.currentObjectState = CloneObject(tweenedBones[currentIndex]);
		}
	}
	instanceProto.currentTweenedBones = function(animation)
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
			if (this.changeToStartFrom === BLENDTOSTART)
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
				this.tweenBone(bone, tweenedBones, animation, key.bones, i, currentTime, nextTime, key);
			}
		}
		return tweenedBones;
	};
	instanceProto.tick = function()
	{
		if (this.doGetFromPreload)
		{
			this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.readyForSetup, this);
			this.doGetFromPreload = false;
		}
		this.objectOverrides = {};
		this.boneIkOverrides = {};
	}
	instanceProto.tick2 = function(ticklessRefresh)
	{
		if(this.entities.length == 0)
		{
			if((!this.getCharacterFromPreload()) && this.runtime.isWKWebView)
			{
				var self = this;
				this.runtime.fetchLocalFileViaCordovaAsText(this.runtime.getLocalFileUrl(this.properties[0]),
				function (str)
				{
					self.ProcessRawTextFile(str);
				},
				function (err)				
				{	
					console.log(err);
				});
			}
		}
		if (this.secondAnimation === this.currentAnimation && this.currentAnimation)
		{
			this.blendStartTime = 0;
			this.blendEndTime = 0;
			this.blendPoseTime = 0;
			this.secondAnimation = null;
			this.changeAnimTo = 0;
			if (this.changeToStartFrom === BLENDTOSTART)
			{
				this.changeToStartFrom = 0;
			}
			else if (this.changeToStartFrom === BLENDATCURRENTTIMERATIO)
			{
				this.changeToStartFrom = 1;
			}
		}

		if (this.changeAnimTo && !this.inAnimTrigger)
		{
			this.doAnimChange();
		}

		var animation = this.currentAnimation;
		if (!animation || this.inAnimTrigger)
		{
			return;
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
				var currZ = findInArray(this, this.layer.instances);
				if (currZ !== this.lastZ)
				{
					changed = true;
					this.lastZ = currZ;
				}
			}
		}

		if (!changed && this.force)
		{
			changed = true;
		}

		this.force = false;

		// var PAUSENEVER=0;
		// var PAUSEALLOUTSIDEBUFFER=1;
		// var PAUSEALLBUTSOUNDOUTSIDEBUFFER=2;
		// this.leftBuffer=0;
		// this.rightBuffer=0;
		// this.topBuffer=0;
		// this.bottomBuffer=0;
		// this.pauseWhenOutsideBuffer=0;
		var pauseAllButSound = false;
		var pauseAll = false;
		if (this.pauseWhenOutsideBuffer != PAUSENEVER)
		{
			var outsideBuffer = this.isOutsideViewportBox();
			if (outsideBuffer)
			{
				if (this.pauseWhenOutsideBuffer == PAUSEALLOUTSIDEBUFFER)
				{
					pauseAll = true;
				}
				else if (this.pauseWhenOutsideBuffer == PAUSEALLBUTSOUNDOUTSIDEBUFFER)
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
						this.tick2();
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
		this.setAllCollisionsAndVisibility(false);
		this.setMainlineKeyByTime();

		this.runtime.redraw = true;

		if (!animation.mainlineKeys[animation.cur_frame])
		{
			return;
		}

		if (!pauseAllButSound)
		{
			if (this.animBlend !== 0 && this.secondAnimation)
			{
				if (this.changeToStartFrom === BLENDTOSTART)
				{
					this.secondAnimation.localTime = 0;
				}
				else
				{
					this.secondAnimation.localTime = (this.currentSpriterTime / this.currentAnimation.length) * this.secondAnimation.length;
				}
				this.setMainlineKeyByTime(this.secondAnimation);
				var secondTweenedBones = this.currentTweenedBones(this.secondAnimation);
				this.animateCharacter(secondTweenedBones, this.secondAnimation, false);
			}

			var tweenedBones = this.currentTweenedBones();
			this.animateCharacter(tweenedBones);
		}
		if (this.animPlaying)
		{
			this.animateSounds();
			this.animateEvents();
			this.animateMeta(animation.meta);
		}

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
				var c2Obj

				for (var j = 0; j < c2Instances.length; j++)
				{
					c2Obj = c2Instances[j];
					if (c2Obj)
					{
						if (setType === 0 || setType === 1)
						{
							c2Obj.angle = objState.angle;
						}

						if (setType === 0 || setType === 2)
						{
							c2Obj.x = objState.x;
							c2Obj.y = objState.y;
						}

						c2Obj.set_bbox_changed();
					}
				}
			}
			if (!currentObjInstruction.pin)
			{
				this.objectsToSet.splice(i, 1);
				i--;
			}
		}
	};

	instanceProto.animateCharacter = function(tweenedBones, animation, applyToInstances)
	{
		animation = (typeof animation !== 'undefined') ? animation : this.currentAnimation;
		if (!animation)
		{
			return;
		}

		var cur_frame = animation.cur_frame;
		var object;
		var objectRef;
		var nextObject = null;
		var lastTime = 0;
		var nextTime = 0;
		var myx = 0;
		var myy = 0;
		var w = 0;
		var h = 0;
		var layer = this.layer;

		var entity = this.entity;
		var zIndex = this.get_zindex();
		applyToInstances = (typeof applyToInstances !== 'undefined') ? applyToInstances : true;

		var key = animation.mainlineKeys[animation.cur_frame];
		var refKey;
		var instances = layer.instances;
		var currentTime = 0;

		if (animation === this.currentAnimation)
		{
			if (this.changeToStartFrom === BLENDTOSTART)
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

		if (applyToInstances && !this.drawSelf)
		{
			var zOrder = [];

			for (var i = 0; i < key.objects.length; i++)
			{
				object = key.objects[i];
				if (object.type == "reference")
				{
					var refTimeline = animation.timelines[object.timeline];
					var c2Obj = refTimeline.c2Object;
					if (c2Obj)
					{
						var inst = c2Obj.inst;
						if (inst && (this.setLayersForSprites || inst.layer == this.layer))
						{
							var currZ = findInArray(inst, instances);

							if (currZ >= 1 && currZ <= zIndex)
							{
								instances.splice(currZ, 1);
								zIndex--;
							}
						}
					}
				}
			}
			var tempZ = findInArray(this, instances);

			if (zIndex != tempZ)
			{
				instances.splice(tempZ, 1);

				if (tempZ < zIndex)
				{
					zIndex--;
				}
				instances.splice(zIndex, 0, this);
				layer.setZIndicesStaleFrom(0);
				this.zindex = zIndex;
			}

		}

		var zCounter = 0;

		for (var i = 0; i < key.objects.length; i++)
		{
			object = key.objects[i];
			objectRef = key.objects[i];
			nextObject = null;
			var nextFrame = null;
			var timelineIndex;
			if (object.type == "reference")
			{
				var refTimeline = animation.timelines[object.timeline];
				timelineIndex = object.timeline;
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

			myx = this.x;
			myy = this.y;

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
						inst.collisionsEnabled = true;
						inst.visible = this.visible;
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
						t = trueT(refKey, t);
						tweenedObj = TweenedSpriterObject(object, nextObject, t, refKey.spin);
					}
					else
					{
						tweenedObj = CloneObject(object);
					}
					if (applyToInstances && c2Obj && c2Obj.spriterType == "sprite")
					{
						tweenedObj.frame = SetSpriteAnimFrame(inst, object.frame, c2Obj);
					}
					if (inst)
					{
						var cur_frame = inst.curFrame;
					}
					var mirror_factor = (this.xFlip == 1 ? -1 : 1);
					var flip_factor = (this.yFlip == 1 ? -1 : 1);

					var parent = objectRef.parent;

					refTimeline.currentMappedState = CloneObject(tweenedObj);
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
									tweenedObj = TweenedSpriterObject(firstBone, secondBone, this.animBlend, shortestSpin(firstBone.angle, secondBone.angle));
									if (this.animBlend > 0.5)
									{
										tweenedObj.frame = SetSpriteAnimFrame(inst, secondTimeline.currentObjectState.frame, c2Obj);
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
							tweenedObj.angle = tweenedObj.angle - cr.to_radians(180);
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

					if (inst && applyToInstances && (this.setLayersForSprites || inst.layer == this.layer))
					{
						var instZOrder = zIndex + 1 + zCounter++;
						if (instances[instZOrder] !== inst)
						{
							//var currInstanceZ=instances.indexOf(inst);
							var currInstanceZ = findInArray(inst, instances);
							if (currInstanceZ >= 0)
							{
								instances.splice(currInstanceZ, 1);
							}
							instances.splice(instZOrder, 0, inst);
							inst.zorder = instZOrder;
							layer.setZIndicesStaleFrom(0);
						}
					}
				}
			}
		}
	};

	instanceProto.animateSounds = function()
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

	instanceProto.animateMeta = function(meta, anim)
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

	instanceProto.animateEvents = function()
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

	instanceProto.testTriggerTime = function(lastTime, time, triggerTime)
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

	instanceProto.animateSound = function(soundline, animLength, anim)
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
			var t = getT(lastTime, nextTime, this.currentAdjustedTime);
			tweenedSound = TweenedSpriterSound(curSound, nextObject, trueT(curSoundKey, t));
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

	instanceProto.animateEvent = function(eventline, animLength, anim)
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

	instanceProto.animateVar = function(varline, animLength, anim)
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

		var t = getT(firstTime, secondTime, time);

		varline.currentVal = cr.lerp(firstVal, secondVal, trueT(firstKey, t));
		if (type === "int")
		{
			varline.currentVal = Math.floor(varline.currentVal);
		}
	}
	instanceProto.animateTag = function(tagline, animLength, anim)
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
	instanceProto.draw = function(ctx)
	{
		if (!this.drawSelf)
		{
			return;
		}

		ctx.globalAlpha = this.opacity;

		// The current animation frame to draw
		var cur_frame = this.type.animations[0].frames[0];
		var spritesheeted = cur_frame.spritesheeted;
		var cur_image = cur_frame.texture_img;

		var myx = this.x;
		var myy = this.y;
		var w = this.width;
		var h = this.height;

		var widthfactor = w > 0 ? 1 : -1;
		var heightfactor = h > 0 ? 1 : -1;

		var mirror_factor = (this.xFlip == 1 ? -1 : 1);
		var flip_factor = (this.yFlip == 1 ? -1 : 1);

		var object = null;

		var animation = (typeof animation !== 'undefined') ? animation : this.currentAnimation;
		var cur_frame = animation.cur_frame;

		if (this.currentAnimation)
		{
			var key = this.currentAnimation.mainlineKeys[this.currentAnimation.cur_frame];
			if (key)
			{
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

								var angle = objState.angle;

								var drawx = 0;
								var drawy = 0;

								ctx.save();

								ctx.translate(objState.x, objState.y);

								if (widthfactor !== 1 || heightfactor !== 1)
								{
									ctx.scale(widthfactor, heightfactor);
								}

								if (mirror_factor !== 1 || flip_factor !== 1)
								{
									ctx.scale(mirror_factor, flip_factor);
								}

								var absPivotX = objState.pivotX * atlasInfo.w;
								drawx = atlasInfo.atlasXOff - absPivotX;

								if (atlasInfo.atlasRotated)
								{
									var reverseAbsPivotY = (1.0 - objState.pivotY) * atlasInfo.h;
									var reverseXOff = atlasInfo.h - (atlasInfo.atlasYOff + atlasInfo.atlasH);

									angle -= cr.to_radians(90);
									drawy = reverseXOff - reverseAbsPivotY;
								}
								else
								{
									var absPivotY = objState.pivotY * atlasInfo.h;

									drawy = atlasInfo.atlasYOff - absPivotY;
								}

								drawx *= objState.xScale;
								drawy *= objState.yScale;

								if (mirror_factor * flip_factor == -1)
								{
									if (atlasInfo.atlasRotated)
									{
										angle -= cr.to_radians(180);
									}
									angle *= -1;
								}
								ctx.rotate(angle * widthfactor * heightfactor);
								if (atlasInfo.atlasRotated)
								{
									ctx.drawImage(cur_image,

										atlasInfo.atlasX,
										atlasInfo.atlasY,

										atlasInfo.atlasH,
										atlasInfo.atlasW,

										drawy, drawx,

										atlasInfo.atlasH * this.scaleRatio,
										atlasInfo.atlasW * this.scaleRatio);
								}
								else
								{
									ctx.drawImage(cur_image,

										atlasInfo.atlasX,
										atlasInfo.atlasY,

										atlasInfo.atlasW,
										atlasInfo.atlasH,

										drawx, drawy,

										atlasInfo.atlasW * this.scaleRatio,
										atlasInfo.atlasH * this.scaleRatio);
								}

								// Restore previous state.
								ctx.restore();

							}
						}
					}
				}
			}
		}
	};

	instanceProto.drawGL = function(glw)
	{
		if (!this.drawSelf)
		{
			return;
		}

		glw.setOpacity(this.opacity);

		// The current animation frame to draw
		var cur_frame = this.type.animations[0].frames[0];
		var cur_image = cur_frame.texture_img;

		var webGL_texture = this.runtime.glwrap.loadTexture(cur_image, false, this.runtime.linearSampling, cur_frame.pixelformat);
		glw.setTexture(webGL_texture);

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
				var sheetTex = this.type.sheetTex;
				var cur_imageWidth = cur_image.width * (sheetTex.right - sheetTex.left);
				var cur_imageHeight = cur_image.height * (sheetTex.bottom - sheetTex.top);
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

								var angle = objState.angle;

								if (mirror_factor * flip_factor == -1)
								{
									angle -= cr.to_radians(180);

									if (!atlasInfo.atlasRotated)
									{
										angle *= -1;
										angle = cr.to_radians(180) - angle;
									}
								}

								uv.left = (atlasInfo.atlasX) / cur_imageWidth;
								uv.top = (atlasInfo.atlasY) / cur_imageHeight;

								var w = 0;
								var h = 0;

								if (atlasInfo.atlasRotated)
								{
									angle -= cr.to_radians(90);
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

								var cur_frame = this.curFrame;

								var bbox = new cr.rect(0, 0, 0, 0);
								var bquad = new cr.quad();

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
								bquad.set_from_rotated_rect(bbox, angle); // rotate around origin
								bquad.offset(objState.x, objState.y); // translate back to original position

								// Generate bounding box from rotated quad
								bquad.bounding_box(bbox);

								// Normalize bounding box in case of mirror/flip
								bbox.normalize();

								var q = bquad;

								glw.setOpacity(this.opacity * objState.a);

								var finalUv = {};
								finalUv.left = cr.lerp(sheetTex.left, sheetTex.right, uv.left);
								finalUv.right = cr.lerp(sheetTex.left, sheetTex.right, uv.right);
								finalUv.top = cr.lerp(sheetTex.top, sheetTex.bottom, uv.top);
								finalUv.bottom = cr.lerp(sheetTex.top, sheetTex.bottom, uv.bottom);

								glw.quadTex(q.tlx, q.tly, q.trx, q.try_, q.brx, q.bry, q.blx, q.bly, finalUv);

							}
						}
					}
				}
			}
		}
	};

	instanceProto.playSound = function(soundLine, name)
	{
		this.soundToTrigger = name;
		this.soundLineToTrigger = soundLine;
		this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnSoundTriggered, this);
	}

	instanceProto.playEvent = function(eventLine, name)
	{
		this.eventToTrigger = eventLine.name;
		this.eventLineToTrigger = eventLine;
		this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnEventTriggered, this);
	}

	instanceProto.changeVolume = function(soundLine, newVolume)
	{
		if (soundLine.currentObjectState.volume != newVolume)
		{
			soundLine.currentObjectState.volume = newVolume;
			this.soundToTrigger = "";
			this.soundLineToTrigger = soundLine;
			this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnSoundVolumeChangeTriggered, this);
		}
	}
	instanceProto.changePanning = function(soundLine, newPanning)
	{
		if (soundLine.currentObjectState.panning != newPanning)
		{
			soundLine.currentObjectState.panning = newPanning;
			this.soundToTrigger = "";
			this.soundLineToTrigger = soundLine;
			this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnSoundPanningChangeTriggered, this);
		}
	}

	function findObjectItemInArray(name, objectArray, entityName)
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

	function objectFromArray(name, objectArray, entityName)
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

	function SpriterObjectArrayItem(spritername, name, entityName, originalName, varDefs)
	{
		this.name = name;
		this.fullTypeName = spritername + "_" + name;
		this.fullTypeName = this.fullTypeName.replace(/-/g,'');
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
	}
	instanceProto.timelineFromName = function(name, anim)
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

	instanceProto.tagStatus = function(tagname, meta)
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

	instanceProto.varStatus = function(ret, varname, meta)
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
						if (varline.def.type === "string")
						{
							ret.set_string(varline.currentVal);
						}
						else if (varline.def.type === "int")
						{
							ret.set_int(varline.currentVal);
						}
						else
						{
							ret.set_float(varline.currentVal);
						}
						return;
					}
				}
			}
		}
		ret.set_float(0);
	}

	instanceProto.loadTagDefs = function(json)
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

	instanceProto.loadVarDefs = function(json, varDefs)
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

	instanceProto.findSprites = function(xml) //XMLDocument object, name of entityToLoad
		{
			if (!xml)
			{
				return;
			}

			var thisTypeName = this.type.name;
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

	instanceProto.generateTestC2ObjectArray = function(objectArray)
	{
		var c2Objects = [];
		var types = this.runtime.types;
		for (var o = 0, len = objectArray.length; o < len; o++)
		{
			var c2Object = {};
			c2Object.type = types[objectArray[o].fullTypeName];
			c2Object.spriterType = objectArray[o].spriterType;
			c2Object.inst = null;
			c2Object.appliedMap = [];
			c2Object.obj = objectArray[o];
			c2Objects.push(c2Object);
		}
		return c2Objects;
	};
	instanceProto.cloneSound = function(other)
	{
		var sound = new SpriterSound();
		sound.trigger = other.trigger;
		sound.volume = other.volume;
		sound.panning = other.panning;
		sound.name = other.name;
		return sound;
	};
	instanceProto.cloneObject = function(other)
	{
		var folderIndex = -null;
		var fileIndex = null;
		var fileName = null;
		var NO_INDEX = -1;
		var object = new SpriterObject();
		object.type = other.type;
		object.frame = other.frame;
		object.storedFrame = other.storedFrame;
		object.x = (other.x);
		object.y = -(other.y);
		object.angle = ((other.angle));
		object.a = ((other.a));
		object.angle = other.angle;
		object.xScale = (other.xScale);
		object.yScale = (other.yScale);
		object.pivotX = (other.pivotX);
		object.pivotY = (other.pivotY);
		object.entity = other.entity;
		object.animation = other.animation;
		object.t = other.t;
		object.defaultPivot = other.defaultPivot;
		return object;
	};
	instanceProto.objectFromTag = function(objectTag, objectArray, timelineName, object_type, entityName)
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
			var objectItem = objectArray[findObjectItemInArray(timelineName, objectArray, entityName)];
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
	instanceProto.soundFromTag = function(soundTag)
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
	instanceProto.initDOMtoPairedObjects = function()
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
										timeline.c2Object = this.c2ObjectArray[findObjectItemInArray(timeline.name, this.objectArray, entity.name)];
									}
								}
							}
						}
					}
				}
			}
		}
	};
	instanceProto.associateAllTypes = function()
	{
		var c2ObjectArray = this.c2ObjectArray;
		var objectArray = this.objectArray;

		for (var o = 0, len = objectArray.length; o < len; o++)
		{
			var obj = objectArray[o];

			var siblings = this.siblings;
			if (siblings && siblings.length > 0)
			{
				for (var s = 0; s < siblings.length; s++)
				{
					var sibling = siblings[s];
					if (sibling)
					{
						var type = sibling.type;
						if (type.name === obj.fullTypeName)
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
					obj.fullTypeName = type.name;
					c2Object.type = type;
					var iid = this.get_iid(); // get my IID
					var paired_inst = type.instances[iid];
					c2Object.inst = paired_inst;
					var animations = this.entity.animations;
				}
				break;
			}
		}
	};

	instanceProto.loadSCML = function(json_)
	{
		this.loadTagDefs(json_);
		this.objectArray = this.findSprites(json_);
		if (!this.type.objectArrays[this.properties[0]])
		{
			this.type.objectArrays[this.properties[0]] = this.objectArray;
			this.type.boneWidthArrays[this.properties[0]] = this.boneWidthArray;
		}
		this.c2ObjectArray = this.generateTestC2ObjectArray(this.objectArray);

		var thisTypeName = this.type.name;
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
					setTimeInfoFromJson(keyTag, key);
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
	instanceProto.setAnimToIndex = function(animIndex)
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

			this.runtime.tick2Me(this);
		}
	}

	instanceProto.setAnim = function(animName, startFrom, blendDuration)
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

		if (startFrom > PLAYFROMCURRENTTIMERATIO && blendDuration > 0)
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
			this.blendEndTime = this.blendStartTime + ((blendDuration / 1000) / (this.ignoreGlobalTimeScale ? 1 : this.runtime.timescale));
		}
		else
		{
			if (blendDuration <= 0)
			{
				if (startFrom === BLENDATCURRENTTIMERATIO)
				{
					startFrom = 2;
				}
				else if (startFrom == BLENDTOSTART)
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
		if (startFrom === BLENDTOSTART && this.secondAnimation)
		{
			this.blendPoseTime = this.currentSpriterTime;
			this.secondAnimation.localTime = 0;
			this.setMainlineKeyByTime(this.secondAnimation);
			var secondTweenedBones = this.currentTweenedBones(this.secondAnimation);
			this.animateCharacter(secondTweenedBones, this.secondAnimation, false);
		}
		this.setAnimTo(animName, false);
		var animPlaying = this.animPlaying;
		this.animPlaying = false;
		this.tick2(true);
		this.animPlaying = animPlaying;
	};
	instanceProto.doRequest = function(json, url_, method_)
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
			self.type.scmlFiles[self.properties[0]] = self.entities;
			self.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.readyForSetup, self);
			self.setAnimTo(self.properties[2], true);
			if (!self.currentAnimation && self.entity && self.entity.animations.length)
			{
				self.setAnimTo(self.entity.animations[0].name, true);
			}
			for (var i = 0; i < self.type.scmlInstsToNotify[self.properties[0]].length; i++)
			{
				var inst = self.type.scmlInstsToNotify[self.properties[0]][i];
				inst.forceCharacterFromPreload();
			}
			delete self.type.scmlReserved[self.properties[0]];
			self.type.scmlInstsToNotify[self.properties[0]] = [];
		}
		catch (e)
		{
			//errorFunc();
		}

	};

	instanceProto.getAnimFromEntity = function(animName)
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

	instanceProto.mapObjToObj = function(parentObject, obj, flipAngle)
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

	instanceProto.instsEqual = function(obj, inst)
	{
		return obj.x == inst.x && obj.y == inst.y && obj.a == inst.opacity && obj.angle == inst.angle;
	};

	instanceProto.objFromInst = function(inst)
	{
		var obj = new SpriterObject();
		obj.pivotX = inst.hotspotX;
		obj.pivotY = inst.hotspotY;
		obj.defaultPivot = false;
		obj.x = inst.x;
		obj.y = inst.y;
		obj.a = inst.opacity;
		obj.angle = inst.angle;
		obj.frame = inst.curFrame;
		obj.storedFrame = inst.storedFrame;
		return obj;
	};
	instanceProto.currentFrame = function()
	{
		if (this.currentAnimation)
		{
			return this.currentAnimation.cur_frame;
		}
		return 0;
	}
	instanceProto.applyPivotToInst = function(inst, pivotX, pivotY, objWidth, objHeight)
	{
		var x = -1 * pivotX * objWidth;
		var y = -1 * pivotY * objHeight;
		var angle = inst.angle;
		var s = 0;
		var c = 1;

		if (angle != 0)
		{
			s = Math.sin(angle);
			c = Math.cos(angle);
		}
		var xnew = (x * c) - (y * s);
		var ynew = (x * s) + (y * c);

		inst.x = xnew + inst.x;
		inst.y = ynew + inst.y;
	};
	instanceProto.distance = function(ax, ay, bx, by)
	{
		return Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
	}
	instanceProto.applyIk = function(targetX, targetY, addToLength, parentBone, childBoneAbs, childBoneLocal, childBoneLength)
	{
		if (!parentBone || !childBoneLocal)
		{
			return;
		}

		var ikReversal = false;
		var distanceAB = this.distance(0, 0, childBoneLocal.x * parentBone.xScale, childBoneLocal.y * parentBone.yScale);
		var distanceATarget = this.distance(parentBone.x, parentBone.y, targetX, targetY);
		var distanceBTarget = fabs(childBoneLength * childBoneLocal.xScale * parentBone.xScale) + addToLength;
		var parentBoneFactor = parentBone.scaleX * parentBone.scaleY < 0 ? true : false;
		if (distanceATarget > distanceAB + distanceBTarget)
		{
			var newAngle = (cr.to_radians(270) - (Math.atan2(parentBone.x - targetX, parentBone.y - targetY)));
			if (parentBone.scaleX < 0)
			{
				newAngle = newAngle - cr.to_radians(180);
			}
			if (this.xFlip)
			{
				newAngle -= cr.to_radians(180);
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

			var angleOffset = cr.to_radians(270) - Math.atan2(xDiff, yDiff);
			var childAngleOffset = (cr.to_radians(270) - Math.atan2(parentBone.x - childBoneAbs.x, parentBone.y - childBoneAbs.y)) - parentBone.angle;
			if (childBoneLocal.angle > 0)
			{
				ikReversal = true;
			}
			newAngle = angleOffset + (newAngle * (ikReversal ? -1 : 1) * (parentBoneFactor ? -1 : 1));
			if (parentBone.scaleX < 0)
			{
				childAngleOffset = childAngleOffset - cr.to_radians(180);
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
					newAngle = newAngle - cr.to_radians(180);
				}
			}
			parentBone.angle = newAngle;
		}
		childBoneAbs = this.mapObjToObj(parentBone, childBoneLocal, parentBone.xScale * parentBone.yScale);
		var newAngle = cr.to_radians(270) - Math.atan2(childBoneAbs.x - targetX, childBoneAbs.y - targetY);

		if (childBoneAbs.scaleX < 0)
		{
			newAngle -= cr.to_radians(180);
		}
		if (this.xFlip)
		{
			newAngle -= cr.to_radians(180);
		}
		if (parentBoneFactor)
		{
			newAngle = cr.to_radians(360) - newAngle;
			newAngle *= -1;
		}

		childBoneAbs.angle = newAngle;
		return childBoneAbs;
	}

	instanceProto.applyObjToInst = function(obj, inst, dontApplyGlobalScale, c2Object)
	{
		var overrodeImage = false;
		var overrideComponents = this.objectOverrides[c2Object.obj.originalName];
		if (typeof overrideComponents !== "undefined")
		{
			for (var component in overrideComponents)
			{
				switch (component)
				{
					case COMPONENTANGLE:
						obj.angle = cr.to_radians(overrideComponents[component]);
						this.force = true;
						break;
					case COMPONENTX:
						obj.x = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTY:
						obj.y = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTSCALEX:
						obj.xScale = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTSCALEY:
						obj.yScale = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTIMAGE:
						obj.frame = SetSpriteAnimFrame(inst, overrideComponents[component], c2Object);
						overrodeImage = true;
						this.force = true;
						break;
					case COMPONENTPIVOTX:
						obj.pivotX = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTPIVOTY:
						obj.pivotY = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTENTITY:
						obj.entity = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTANIMATION:
						obj.animation = overrideComponents[component];
						this.force = true;
						break;
					case COMPONENTTIMERATIO:
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
		inst.angle = obj.angle;
		inst.opacity = obj.a;
		var cur_frame = inst.curFrame;

		// hotspots are set back to zero if the project was imported with older versions of c2
		// which could cause the bounding box to shift incorrectly
		// this is a better failure for users who haven't reimported their projects after the update
		inst.hotspotX = 0;
		inst.hotspotY = 0;
		inst.x = obj.x;
		inst.y = obj.y;

		var trueW = inst.width;
		var trueH = inst.height;
		if (c2Object.obj.spriterType === "entity")
		{
			inst.subEntScaleX = obj.xScale;
			inst.subEntScaleY = obj.yScale;
			inst.setEntToIndex(obj.entity);
			if (inst.entity)
			{
				inst.setAnimToIndex(obj.animation);
				inst.setAnimTime(1, obj.t);
			}
		}

		if (c2Object.obj.imageSizes && c2Object.obj.imageSizes.length > inst.cur_frame)
		{
			trueW = c2Object.obj.imageSizes[inst.cur_frame].w;
			trueH = c2Object.obj.imageSizes[inst.cur_frame].h;
		}
		var mirror_factor = (this.xFlip == 1 ? -1 : 1);
		var flip_factor = (this.yFlip == 1 ? -1 : 1);

		var new_width = (dontApplyGlobalScale ? 1 : this.scaleRatio) * trueW * obj.xScale * mirror_factor;
		var new_height = (dontApplyGlobalScale ? 1 : this.scaleRatio) * trueH * obj.yScale * flip_factor;

		if (inst.width !== new_width || inst.height !== new_height)
		{
			inst.width = new_width;
			inst.height = new_height;
		}
		var pivX = obj.pivotX;
		var pivY = obj.pivotY;
		if (obj.defaultPivot)
		{
			var curPivot = c2Object.obj.pivots[inst.cur_frame];
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
		inst.set_bbox_changed();
		return overrodeImage;
	};
	instanceProto.setEntTo = function(entName)
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
	instanceProto.setEntToIndex = function(entIndex)
	{
		this.entity = this.entities[entIndex];
		if (!this.entity && this.entities.length)
		{
			this.entity = this.entities[0];
		}
	};
	instanceProto.setAllCollisionsAndVisibility = function(newState)
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
					if (!this.drawSelf && c2Object.obj && c2Object.obj.frames.length > 0)
					{
						this.associateAllTypes();
						inst = c2Object.inst;
					}
				}
				else
				{
					inst.collisionsEnabled = newState;
					inst.visible = newState;
				}
			}
		}
	};

	instanceProto.setAllInvisible = function()
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
					inst.visible = false;
				}
			}
		}
	};
	instanceProto.setAnimTo = function(animName, tick)
	{
		tick = (typeof tick !== 'undefined') ? tick : true;
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
		if (anim)
		{
			this.animPlaying = true;
		}

		this.setAllCollisionsAndVisibility(false);

		this.runtime.tick2Me(this);
		if (tick)
		{
			this.tick2();
		}
	};
	instanceProto.resetEventChecksToCurrentTime = function()
	{
		this.resetEventChecksToTime(this.currentSpriterTime);
	}
	instanceProto.resetEventChecksToTime = function(time)
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
	instanceProto.setAnimTime = function(units, time)
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
	instanceProto.soundlineFromName = function(name)
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

	//////////////////////////////////////
	// Conditions
	function Cnds()
	{}

	Cnds.prototype.readyForSetup = function()
	{
		return true;
	};

	Cnds.prototype.outsidePaddedViewport = function()
	{
		return this.isOutsideViewportBox();
	}

	Cnds.prototype.actionPointExists = function(pointName)
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
	};
	Cnds.prototype.objectExists = function(pointName)
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
	};
	Cnds.prototype.OnAnimFinished = function(animname)
	{
		return this.currentAnimation.name.toLowerCase() === animname.toLowerCase();
	};
	Cnds.prototype.OnSoundTriggered = function()
	{
		return true;
	};
	Cnds.prototype.OnEventTriggered = function(name)
	{
		if (name === this.eventToTrigger)
		{
			return true;
		}
	};

	Cnds.prototype.tagActive = function(tagName, objectName)
	{
		var anim = this.currentAnimation;
		if (anim)
		{
			if (objectName)
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

	Cnds.prototype.OnSoundVolumeChangeTriggered = function()
	{
		return true;
	};
	Cnds.prototype.OnSoundPanningChangeTriggered = function()
	{
		return true;
	};
	Cnds.prototype.OnAnyAnimFinished = function()
	{
		//this.runtime.trigger(cr.plugins_.Spriter.prototype.cnds.OnAnimFinished, this);
		return true;
	};
	// AddCmpParam("Current Key Frame is ", "Is the current Key Frame <,>,=,etc to the value below");
	// AddNumberParam("Frame","The frame number to compare the current key frame to" ,"0")	;
	// AddCondition(2,0, "Compare Current Key Frame", "Key Frames", "Current Key Frame is {0} {1}", "Compare the current key frame number.", "CompareCurrentKey");
	Cnds.prototype.CompareCurrentKey = function(cmp, frame)
	{
		return cr.do_cmp(this.currentFrame(), cmp, frame);
	};
	// AddCmpParam("Current Animation Time is ", "Is the current time <,>,=,etc to the value below");
	// AddNumberParam("Time","The time to compare the current key frame to" ,"0")	;
	// AddComboParamOption("milliseconds");
	// AddComboParamOption("ratio of the animation length");
	// AddComboParam("Time Format", "Is the 'Time' value above expressed in milliseconds or as a ratio",0);
	// AddCondition(3,0, "Compare Current Time", "Animations", "Current Time is {0} {1} {2}", "Compare the current time.", "CompareCurrentTime");
	Cnds.prototype.CompareCurrentTime = function(cmp, time, format)
	{
		if (format === 0) //milliseconds
		{
			return cr.do_cmp(this.currentSpriterTime, cmp, time);
		}
		else
		{
			var anim = this.currentAnimation;
			if (anim)
			{
				return cr.do_cmp(this.currentSpriterTime / this.currentAnimation.length, cmp, time);
			}
			else
			{
				return false;
			}
		}
	};

	// AddStringParam("Animation", "Is this the current animation.");
	// AddCondition(4, 0, "Compare Current Animation", "Animations", "Is current animation {0}", "Compare the name of the current animation.", "CompareAnimation");
	Cnds.prototype.CompareAnimation = function(name)
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
	};

	Cnds.prototype.CompareSecondAnimation = function(name)
	{
		if (this.secondAnimation)
		{
			return name === this.secondAnimation.name;
		}
		else
		{
			return false;
		}
	},	

	// AddStringParam("Entity", "Is this the current entity.");
	// AddCondition(16, 0, "Compare Current Entity", "Entities", "Is current entity {0}", "Compare the name of the current entity.", "CompareEntity");
	Cnds.prototype.CompareEntity = function(name)
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
	};

	// AddCondition(5, 0, "Is Paused", "Animations", "If animation is paused", "Is animation paused?", "AnimationPaused");
	Cnds.prototype.AnimationPaused = function()
	{
		return !this.animPlaying;
	};
	// AddCondition(6, 0, "Is Looping", "Animations", "If animation is looping", "Is animation set to loop?", "AnimationLooping");
	Cnds.prototype.AnimationLooping = function()
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
	};

	Cnds.prototype.isMirrored = function()
	{
		return this.xFlip;
	};

	Cnds.prototype.isFlipped = function()
	{
		return this.yFlip;
	};

	pluginProto.cnds = new Cnds();

	//////////////////////////////////////
	// Actions
	function Acts()
	{}

	Acts.prototype.setPlaybackSpeedRatio = function(newSpeed)
	{
		this.speedRatio = newSpeed;
	};

	Acts.prototype.setVisible = function(visible)
	{
		if (visible === 1)
		{
			this.visible = true;
		}
		else
		{
			this.visible = false;
		}
	};
	Acts.prototype.setOpacity = function(newOpacity)
	{
		this.opacity = clamp(0.0, 1.0, newOpacity / 100.0);
	};
	Acts.prototype.setAutomaticPausing = function(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer)
	{
		this.pauseWhenOutsideBuffer = newPauseSetting;
		this.leftBuffer = leftBuffer;
		this.rightBuffer = rightBuffer;
		this.topBuffer = topBuffer;
		this.bottomBuffer = bottomBuffer;
	}
	Acts.prototype.setObjectScaleRatio = function(newScale, xFlip, yFlip)
	{
		this.scaleRatio = newScale;
		this.xFlip = xFlip;
		this.yFlip = yFlip;
		this.force = true;
	};

	Acts.prototype.setObjectXFlip = function(xFlip)
	{
		this.xFlip = xFlip;
		this.force = true;
	};

	Acts.prototype.setIgnoreGlobalTimeScale = function(ignore)
	{
		this.ignoreGlobalTimeScale = (ignore == 1);
	}

	Acts.prototype.findSpriterObject = function(c2Object)
	{
		if (this.currentAnimation)
		{
			var timelines = this.currentAnimation.timelines;
			for (var t = 0; t < timelines.length; t++)
			{
				var timeline = timelines[t];
				if (timeline && timeline.c2Object)
				{
					if (timeline.c2Object.inst == c2Object.getFirstPicked())
					{
						this.lastFoundObject = timeline.name;
						return;
					}
				}
			}
		}
	}

	Acts.prototype.stopResumeSettingLayer = function(resume)
	{
		this.setLayersForSprites = resume == 1;
	}

	Acts.prototype.setObjectYFlip = function(yFlip)
	{
		this.yFlip = yFlip;
		this.force = true;
	};
	var PLAYFROMSTART = 0;
	var PLAYFROMCURRENTTIME = 1;
	var PLAYFROMCURRENTTIMERATIO = 2;
	var BLENDTOSTART = 3;
	var BLENDATCURRENTTIMERATIO = 4;

	Acts.prototype.setC2ObjectToSpriterObject = function(c2Object, propertiesToSet, spriterObjectName)
	{
		var c2instance = c2Object.getCurrentSol().instances;
		if (c2instance.length === 0 && c2Object.getCurrentSol().select_all === true)
			c2instance = c2Object.instances;
		this.objectsToSet.push(new C2ObjectToSpriterObjectInstruction(c2instance, spriterObjectName, propertiesToSet, false));
	}

	Acts.prototype.pinC2ObjectToSpriterObject = function(c2Object, propertiesToSet, spriterObjectName)
	{
		var c2instance = c2Object.getCurrentSol().instances;
		if (c2instance.length === 0 && c2Object.getCurrentSol().select_all === true)
			c2instance = c2Object.instances;
		this.objectsToSet.push(new C2ObjectToSpriterObjectInstruction(c2instance, spriterObjectName, propertiesToSet, true));
	}

	Acts.prototype.unpinC2ObjectFromSpriterObject = function(c2Object, spriterObjectName)
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

	Acts.prototype.unpinAllFromSpriterObject = function(spriterObjectName)
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

	Acts.prototype.setAnimation = function(animName, startFrom, blendDuration)
	{
		this.setAnim(animName, startFrom, blendDuration);
	};

	Acts.prototype.setSecondAnim = function(animName)
	{
		this.secondAnimation = this.getAnimFromEntity(animName);
		if (this.secondAnimation === this.currentAnimation)
		{
			this.secondAnimation = null;
		}
	};
	Acts.prototype.stopSecondAnim = function(animName)
	{
		this.secondAnimation = null;
		this.animBlend = 0;
	};
	Acts.prototype.setAnimBlendRatio = function(newBlend)
	{
		this.animBlend = newBlend;
	};
	Acts.prototype.setEnt = function(entName, animName)
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
			this.setAnimTo(newAnimName);
		}

	};

	Acts.prototype.playAnimTo = function(units, playTo)
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
		this.tick2();
	};

	Acts.prototype.associateTypeWithName = function(type, name)
	{
		var c2ObjectArray = this.c2ObjectArray;
		var objectArray = this.objectArray;

		for (var o = 0, len = objectArray.length; o < len; o++)
		{
			var obj = objectArray[o];
			if (name == obj.name)
			{
				obj.fullTypeName = type.name;
				var c2Object = c2ObjectArray[o];
				c2Object.type = type;
				var iid = this.get_iid(); // get my IID
				var paired_inst = type.instances[iid];
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
	};
	Acts.prototype.setAnimationLoop = function(loopOn)
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
	};
	Acts.prototype.setAnimationTime = function(units, time)
	{
		this.resetEventChecksToTime(time);
		this.setAnimTime(units, time);
	};
	Acts.prototype.pauseAnimation = function()
	{
		this.animPlaying = false;
	};

	Acts.prototype.resumeAnimation = function()
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
	};

	Acts.prototype.removeAllCharMaps = function()
	{
		var c2Objs = this.c2ObjectArray;
		for (var c = 0; c < c2Objs.length; c++)
		{
			var c2Obj = c2Objs[c];
			c2Obj.appliedMap = [];
		}
		this.tick2(true);
	};

	Acts.prototype.appendCharMap = function(mapName)
	{
		var c2Objs = this.c2ObjectArray;
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
							}
						}
					}
				}
			}
		}
		this.tick2(true);
	};

	Acts.prototype.overrideObjectComponent = function(objectName, component, newValue)
	{
		var override = this.objectOverrides[objectName];
		if (typeof override === 'undefined')
		{
			this.objectOverrides[objectName] = {};
			override = this.objectOverrides[objectName];
		}
		override[component] = newValue;
	}

	Acts.prototype.overrideBonesWithIk = function(parentBoneName, childBoneName, targetX, targetY, additionalLength)
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

	pluginProto.acts = new Acts();

	//////////////////////////////////////
	// Expressions
	function Exps()
	{}

	Exps.prototype.time = function(ret)
	{
		ret.set_int(this.currentSpriterTime);
	};

	Exps.prototype.val = function(ret, varname, objectName)
	{
		var anim = this.currentAnimation;
		if (anim)
		{
			if (objectName)
			{
				var line = this.timelineFromName(objectName);
				if (line)
				{
					this.varStatus(ret, varname, line.meta);
					return;
				}
			}
			else
			{
				this.varStatus(ret, varname, anim.meta);
				return;
			}
		}
		ret.set_float(0);
	}
	Exps.prototype.pointX = function(ret, name)
	{
		var timeline = this.timelineFromName(name);
		if (timeline && timeline.currentObjectState)
		{
			if (timeline.currentObjectState.x !== undefined)
			{
				ret.set_float(timeline.currentObjectState.x);
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.pointY = function(ret, name)
	{
		var timeline = this.timelineFromName(name);
		if (timeline && timeline.currentObjectState)
		{
			if (timeline.currentObjectState.y !== undefined)
			{
				ret.set_float(timeline.currentObjectState.y);
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.pointAngle = function(ret, name)
	{
		var timeline = this.timelineFromName(name);
		if (timeline && timeline.currentObjectState)
		{
			if (timeline.currentObjectState.angle !== undefined)
			{
				ret.set_float(cr.to_degrees(timeline.currentObjectState.angle));
				return;
			}
		}
		ret.set_float(0);
	};
	Exps.prototype.objectX = function(ret, name)
	{
		var timeline = this.timelineFromName(name);
		if (timeline && timeline.currentObjectState)
		{
			if (timeline.currentObjectState.x !== undefined)
			{
				ret.set_float(timeline.currentObjectState.x);
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.objectY = function(ret, name)
	{
		var timeline = this.timelineFromName(name);
		if (timeline && timeline.currentObjectState)
		{
			if (timeline.currentObjectState.y !== undefined)
			{
				ret.set_float(timeline.currentObjectState.y);
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.objectAngle = function(ret, name)
	{
		var timeline = this.timelineFromName(name);
		if (timeline && timeline.currentObjectState)
		{
			if (timeline.currentObjectState.angle !== undefined)
			{
				ret.set_float(cr.to_degrees(timeline.currentObjectState.angle));
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.timeRatio = function(ret)
	{
		if (this.currentAnimation)
		{
			ret.set_float(this.currentSpriterTime / this.currentAnimation.length);
		}
		else
		{
			ret.set_float(0);
		}
	};

	Exps.prototype.ScaleRatio = function(ret)
	{
		ret.set_float(this.scaleRatio);
	};

	Exps.prototype.key = function(ret)
	{
		ret.set_int(this.currentFrame());
	};

	Exps.prototype.PlayTo = function(ret)
	{
		ret.set_int(this.playTo);
	};

	Exps.prototype.animationName = function(ret)
	{
		if (this.changeAnimTo)
		{
			ret.set_string(this.changeAnimTo.name);
		}
		//else if(this.currentAnimation)
		else if (this.currentAnimation)
		{
			ret.set_string(this.currentAnimation.name);
		}
		else
		{
			ret.set_string("");
		}
	};

	Exps.prototype.animationLength = function(ret)
	{
		if (this.currentAnimation)
		{
			ret.set_int(this.currentAnimation.length);
		}
		else
		{
			ret.set_int(0);
		}
	};

	Exps.prototype.speedRatio = function(ret)
	{
		ret.set_float(this.speedRatio);
	};

	Exps.prototype.secondAnimationName = function(ret)
	{
		if (this.secondAnimation)
		{
			ret.set_string(this.secondAnimation.name);
		}
		else
		{
			ret.set_string("");
		}
	};

	Exps.prototype.entityName = function(ret)
	{
		if (this.entity)
		{
			ret.set_string(this.entity.name);
		}
		else
		{
			ret.set_string("");
		}
	};

	Exps.prototype.PlayToTimeLeft = function(ret)
	{
		if (this.playTo < 0)
		{
			return ret.set_float(0);
		}

		if (this.currentAnimation.looping == "true")
		{
			var forwardDistance = 0;
			var backwardDistance = 0;
			if (speedRatio >= 0)
			{
				if (this.playTo > this.currentSpriterTime)
				{
					return ret.set_float(this.playTo - this.currentSpriterTime);
				}
				else
				{
					return ret.set_float(this.playTo + (this.currentAnimation.length - this.currentSpriterTime));
				}
			}
			else
			{
				if (this.playTo > this.currentSpriterTime)
				{
					return ret.set_float((this.currentAnimation.length - this.playTo) + this.currentSpriterTime);
				}
				else
				{
					return ret.set_float(this.currentSpriterTime - this.playTo);
				}
			}
		}
		else
		{
			return ret.set_float(Math.abs(this.playTo - this.currentSpriterTime));
		}

	};
	Exps.prototype.triggeredSound = function(ret)
	{
		ret.set_string(this.soundToTrigger);
	};

	Exps.prototype.triggeredSoundTag = function(ret)
	{
		if (this.soundLineToTrigger)
		{
			ret.set_string(this.soundLineToTrigger.name);
			return;
		}
		//else
		ret.set_string("");
	};

	Exps.prototype.soundVolume = function(ret, soundTag)
	{
		var soundline = this.soundlineFromName(soundTag);
		if (soundline)
		{
			if (soundline.currentObjectState)
			{
				ret.set_float(soundline.currentObjectState.volume);
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.soundPanning = function(ret, soundTag)
	{
		var soundline = this.soundlineFromName(soundTag);
		if (soundline)
		{
			if (soundline.currentObjectState)
			{
				ret.set_float(soundline.currentObjectState.panning);
				return;
			}
		}
		ret.set_float(0);
	};

	Exps.prototype.blendRatio = function(ret)
	{
		ret.set_float(this.animBlend);
	};

	Exps.prototype.Opacity = function(ret)
	{
		ret.set_float(this.opacity * 100.0);
	}

	Exps.prototype.BBoxLeft = function(ret)
	{
		this.update_bbox();
		ret.set_float(this.bbox.left);
	};

	Exps.prototype.BBoxTop = function(ret)
	{
		this.update_bbox();
		ret.set_float(this.bbox.top);
	};

	Exps.prototype.BBoxRight = function(ret)
	{
		this.update_bbox();
		ret.set_float(this.bbox.right);
	};

	Exps.prototype.BBoxBottom = function(ret)
	{
		this.update_bbox();
		ret.set_float(this.bbox.bottom);
	};

	Exps.prototype.foundObject = function(ret)
	{
		ret.set_string(this.lastFoundObject);
	};

	pluginProto.exps = new Exps();

}());