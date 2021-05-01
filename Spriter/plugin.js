"use strict";

{
    const SDK = self.SDK;
    const lang = self.lang;    

	const PLUGIN_ID = "Spriter";
	const PLUGIN_VERSION = "01-05-2021";
	const PLUGIN_CATEGORY = "general";

	let app = null;

	function GetObjectTypeNamesFromScon(json, scmlObjectTypeName)
	{
		if (!json["scon_version"])
			return false;	
		
		var entities = json["entity"];
		if(!entities)
		{
			return false;
		}
		
		var folders = json["folder"];
		if(!folders)
		{
			return;
		}
		
		var objectTypeNames = [];
		for (const entity of entities)
		{
			var objRefs = GetFirstObjectRefsFromJsonEntity(entity)
			
			var obj_infos = entity["obj_info"];
			if(!obj_infos)
			{
				return false;
			}
			
			for (const obj_info of obj_infos)
			{
				var name = obj_info["name"];
				name = name.replace(/-/g, "");
				objectTypeNames.push(scmlObjectTypeName + "_" + name);
			}
		}
		
		return objectTypeNames;
	}
	
	async function ImportSconFile(droppedFileName, zipFile, opts)
	{
		const baseFileName = droppedFileName.split(".")[0];
		const entry = zipFile.GetEntry(baseFileName + ".scon");
		if (!entry)
			return false;
	
		const sconBlob = await zipFile.ReadBlob(entry);
		
		const layoutView = opts.layoutView;
		const project = layoutView.GetProject();
		const sconFileName = baseFileName + ".scon";
		const oldSconFile = await project.GetProjectFileByName(sconFileName);
		var oldJson = null;
		var oldObjectNames = null;
		if(oldSconFile)
		{
			oldJson = oldSconFile.GetBlob();
			if(oldJson)
			{
				oldJson = await oldJson.text();
				oldJson = JSON.parse(oldJson);
				oldObjectNames = GetObjectTypeNamesFromScon(oldJson, baseFileName);
			}
		}
		project.AddOrReplaceProjectFile(sconBlob, sconFileName, "general");
		
		const json = await zipFile.ReadJson(entry);
		if (!json["scon_version"])
			return false;		
					
		var reimport = false;
		var scmlObjectType = project.GetObjectTypeByName(baseFileName);
		if(scmlObjectType)
		{
			reimport = true;
			var wis = scmlObjectType.GetAllInstances();
			if(wis.length > 0)
			{
				var wi = wis[0];
				opts.layoutX = wi.GetX();
				opts.layoutY = wi.GetY();
			}	
		}
		else
		{		
			scmlObjectType = await project.CreateObjectType("Spriter", baseFileName);
		}
		
		var atlased = json["atlas"];
		if(atlased)
		{
			await LoadAtlasImage(scmlObjectType, zipFile, baseFileName);
		}
		
		if(reimport)
		{
			var wis = scmlObjectType.GetAllInstances();
			for (const wi of wis)
			{
				wi.SetPropertyValue("draw-self", atlased ? "true" : "false");
			}			
		}
		else
		{
			const wi = scmlObjectType.CreateWorldInstance(layoutView.GetActiveLayer());	
			
			wi.SetXY(opts.layoutX, opts.layoutY);
			wi.SetPropertyValue("scml-file", sconFileName);
			
			if(atlased)
			{
				wi.SetPropertyValue("draw-self", "true");
			}
		}
		
		var entities = json["entity"];
		if(!entities)
		{
			return false;
		}
		
		var folders = json["folder"];
		if(!folders)
		{
			return;
		}
		
		const eventSheet = layoutView.GetLayout().GetEventSheet();
		if (!eventSheet)
		{
			return;
		}
		
		const promises = [];
		var c2ObjectTypes = [];
		var objectTypeNamePairs = [];
		var scmlObjectTypeName = scmlObjectType.GetName();
		for (const entity of entities)
		{
			var objRefs = GetFirstObjectRefsFromJsonEntity(entity)
			
			var obj_infos = entity["obj_info"];
			if(!obj_infos)
			{
				return false;
			}
			
			for (const obj_info of obj_infos)
			{
				var objType = obj_info["type"];
				if (!atlased && objType == "sprite")
				{
					promises.push(ImportSpriteData(zipFile, opts, obj_info, folders, objRefs, scmlObjectType, c2ObjectTypes, objectTypeNamePairs));
				}
				else if (objType == "box")
				{
					promises.push(ImportBoxData(zipFile, opts, obj_info, scmlObjectType, c2ObjectTypes, objectTypeNamePairs));
				}
				
				if(!atlased || objType == "box")
				{
					if(oldObjectNames)
					{
						var index = 0;
						while(index != -1)
						{
							var name = scmlObjectTypeName + "_" +obj_info["name"];
							name = name.replace(/-/g, "");
							index = oldObjectNames.indexOf(name);
							if(index > -1)
							{
								oldObjectNames.splice(index, 1);
							}
						}
					}
				}
			}
		}
		
		const sounds = await LoadSounds(folders, zipFile, project);
		if(sounds.length > 0)
		{
			await AddSoundEvents(eventSheet, scmlObjectType, project, baseFileName);
			project.ShowImportAudioDialog(sounds);
		}
		
		
		// Wait for each sprite import to finish.
		await Promise.all(promises);		
		
		if(objectTypeNamePairs.length > 0)
		{
			const eventBlock = await eventSheet.GetRoot().AddEventBlock();
			eventBlock.AddCondition(scmlObjectType, null, "readyforsetup666");
			for(const objectTypeNamePair of objectTypeNamePairs)
			{
				AddAssociativeAction(eventBlock, objectTypeNamePair, scmlObjectType);
			}
		}
		
		var family = project.GetFamilyByName(baseFileName + "Family");
		if(family)
		{
			if(c2ObjectTypes.length > 0)
			{
				family.SetMembers(c2ObjectTypes);
			}
			else
			{
				family.Delete();
			}
		}
		else if(c2ObjectTypes.length > 0)
		{
			project.CreateFamily(baseFileName + "Family", c2ObjectTypes);
		}
		
		c2ObjectTypes.push(scmlObjectType);
		
		if(reimport)
		{
			var oldContainer = scmlObjectType.GetContainer();
			if(oldContainer)
			{
				var members = oldContainer.GetMembers();
				for (const member of members)
				{
					oldContainer.RemoveObjectType(member);
					if(!oldContainer.IsActive())
					{
						break;
					}
				}
			}
			for(const oldObjectName of oldObjectNames)
			{
				var oldObj = project.GetObjectTypeByName(oldObjectName);
				if(oldObj)
				{
					oldObj.Delete();
				}
			}
			
			if(!atlased)
			{
				var newAnim = await scmlObjectType.AddAnimation("Animation 1");
				scmlObjectType.GetAnimations()[0].Delete();
			}
		}
		
		if(c2ObjectTypes.length > 1)
		{
			const container = scmlObjectType.CreateContainer(c2ObjectTypes);
			container.SetSelectMode("wrap");
		}
		
		// Return true to indicate that the data was recognised and imported.
		return true;
	}	
	
	function GetFirstFrame(scmlObjectType)
	{
		const animations = scmlObjectType.GetAnimations();
		const firstAnim = animations[0];
		const frames = firstAnim.GetFrames();
		return frames[0];
	}
	
	async function LoadAtlasImage(scmlObjectType, zipFile, baseFileName)
	{
		const imageEntry = zipFile.GetEntry(baseFileName + ".png");
		const imageBlob = await zipFile.ReadBlob(imageEntry);
		await GetFirstFrame(scmlObjectType).ReplaceBlobAndDecode(imageBlob);
	}
	
	async function LoadSounds(folders, zipFile, project)
	{
		const sounds = []
		for(const folder of folders)
		{
			var files = folder["file"];
			for(const file of files)
			{
				if(file["type"] == "sound")
				{
					const filePath = file["name"];
					const entry = zipFile.GetEntry(filePath);
					if (!entry)
						continue;
				
					const soundBlob = await zipFile.ReadBlob(entry);
					
					var nameSplits = filePath.split("/");
					const fileName = nameSplits[nameSplits.length - 1];
					project.AddOrReplaceProjectFile(soundBlob, fileName, "sound");
					sounds.push(soundBlob);
				}
			}
		}
		return sounds;
	}
	
	async function AddSoundEvents(eventSheet, scmlObjectType, project, baseFileName)
	 {
			const audioEventBlock = await eventSheet.GetRoot().AddEventBlock();
			audioEventBlock.AddCondition(scmlObjectType, null, "onsoundtriggered7");
			var audioObject = project.GetSingleGlobalObjectType("Audio");
			if(!audioObject)
			{
				audioObject = await project.CreateObjectType("Audio", "Audio");
			}
			audioEventBlock.AddAction(audioObject, null, "play-by-name", 
			[
				"sounds", 
				baseFileName + ".TriggeredSound",
				"not-looping",
				0,
				"\"" + baseFileName + "Sound\""
			]);
	}
	
	function GetFirstObjectRefsFromJsonEntity(entity)
	{
		var currentElement = entity["animation"];
		if(!currentElement)
		{
			return;
		}
		currentElement = currentElement[0];
		if(!currentElement)
		{
			return;
		}
		currentElement = currentElement["mainline"];
		if(!currentElement)
		{
			return;
		}
		currentElement = currentElement["key"];
		if(!currentElement)
		{
			return;
		}
		currentElement = currentElement[0];
		if(!currentElement)
		{
			return;
		}
		
		return currentElement["object_ref"];
	}
	
	function SpriterObject(initialX, initialY, objectRealName)
	{
		var newObject = 
		{
			x : initialX,
			y : initialY,
			angle : 0,
			realName : objectRealName,
			startingFolderIndex : -1,
			startingFileIndex : -1,
			scaleX : 1,
			scaleY : 1,
			pivotX : 0,
			pivotY : 0,
			alpha : 1,
			startingFrame : 0,
			width : 0,
			height : 0
		}
		return newObject;
	}
	
	function ObjectTypeNamePair(_objectType, _name)
	{
		const NewPair = 
		{	
			objectType : _objectType,
			name : _name
		};
		return NewPair;
	}	
	
	async function AddAssociativeAction(eventBlock, objectTypeNamePair, scmlObjectType, objectType)
	{
		await eventBlock.AddAction(scmlObjectType, null, "associatetypewithname666", [objectTypeNamePair.objectType, "\"" + objectTypeNamePair.name + "\""]);
	}
	
	async function ImportSpriteData(zipFile, opts, obj_info, folders, objRefs, scmlObjectType, c2ObjectTypes, objectTypeNamePairs)
	{
		const layoutView = opts.layoutView;
		const project = layoutView.GetProject();	
		
		const name = obj_info["name"];
		
		var reimport = false;
		var objectType = project.GetObjectTypeByName(scmlObjectType.GetName() + "_" + name);
		if(!objectType)
		{
			objectType = await project.CreateObjectType("Sprite", scmlObjectType.GetName() + "_" + name);
		}
		else
		{
			reimport = true;
		}
		
		objectTypeNamePairs.push(ObjectTypeNamePair(objectType, name));

		const animations = objectType.GetAnimations();
		const firstAnim = animations[0];
		firstAnim.SetSpeed(0);
		firstAnim.SetLooping(false);
		const frames = firstAnim.GetFrames();
		
		var frame_info = obj_info["frames"];
		if(!frame_info)
		{
			return;
		}		
		
		var spriterObject = SpriterObject(opts.layoutX, opts.layoutY, obj_info["realname"]);
		
		SetSpriterObjectToMainlineRef(objRefs, spriterObject);
		var existingFrames = reimport ? firstAnim.GetFrames() : null;
		for(var i = 0; i < frame_info.length; i++) 
		{
			var frame = frame_info[i];
						
			if (!frame)
			{
				break;		
			}
		
			var folderIndex = frame["folder"];
			var fileIndex = frame["file"];
			
			var file = GetFileFromJsonFolders(folders, folderIndex, fileIndex);
			if(!file)
			{
				break;
			}
			
			const imageEntry = zipFile.GetEntry(file["name"]);
			if(!imageEntry)
			{
				break;
			}
			
			const imageBlob = await zipFile.ReadBlob(imageEntry);
			
			var fileWidth = file["width"];
			var fileHeight = file["height"];
			
			if(i > 0)
			{
				var currentFrame = null; 
				if(reimport && existingFrames.length > i)
				{
					currentFrame = existingFrames[i];
					await currentFrame.ReplaceBlobAndDecode(imageBlob);
				}
				else
				{
					currentFrame = await firstAnim.AddFrame(imageBlob, fileWidth, fileHeight);
				}
				
				if(currentFrame)
				{
					currentFrame.SetOriginX(0);
					currentFrame.SetOriginY(0);
				}
			}
			else
			{
				var currentFrame = frames[0];
				currentFrame.SetOriginX(0);
				currentFrame.SetOriginY(0);
				await currentFrame.ReplaceBlobAndDecode(imageBlob);
			}
			
			if(folderIndex == spriterObject.startingFolderIndex && fileIndex == spriterObject.startingFileIndex)
			{
				spriterObject.startingFrame = i;
			}
			
			if(spriterObject.startingFrame == i)
			{
				spriterObject.width = fileWidth * spriterObject.scaleX;
				spriterObject.height = fileHeight * spriterObject.scaleY;
			}
		}
		
		if(reimport)
		{
			var existingFrames = firstAnim.GetFrames();
			for(var i = existingFrames.length - 1; i >= frame_info.length; i--)
			{	
				existingFrames[i].Delete();
			}
			
			var wis = objectType.GetAllInstances();
			for (const wi of wis)
			{
				ApplySpriterObjectToInst(wi, spriterObject);
			}		
		}
		else
		{
			const wi = objectType.CreateWorldInstance(layoutView.GetActiveLayer());
			ApplySpriterObjectToInst(wi, spriterObject);
		}
		c2ObjectTypes.push(objectType);
	}
	
	function SetSpriterObjectToMainlineRef(objRefs, spriterObject)
	{
		for (const objRef of objRefs)
		{
			if(objRef["name"] == spriterObject.realName)
			{
				spriterObject.x += objRef["abs_x"];
				spriterObject.y += objRef["abs_y"];
				spriterObject.angle = -objRef["abs_angle"] * (Math.PI / 180);
				spriterObject.scaleX = objRef["abs_scale_x"];
				spriterObject.scaleY = objRef["abs_scale_y"];
				spriterObject.pivotX = objRef["abs_pivot_x"];
				spriterObject.pivotY = objRef["abs_pivot_y"];
				spriterObject.alpha = objRef["abs_a"];
				spriterObject.startingFolderIndex = objRef["folder"];
				spriterObject.startingFileIndex = objRef["file"];	
				break;
			}
		}
	}
	
	function GetFileFromJsonFolders(jsonFolders, folderIndex, fileIndex)
	{
		var folder = jsonFolders[folderIndex];
		if(!folder)
		{
			return;
		}
		
		folder = folder["file"];
		if(!folder)
		{
			return;
		}
		
		return folder[fileIndex];
	}
	
	function ApplySpriterObjectToInstPosition(inst, spriterObject)
    {
        var x = -1 * spriterObject.pivotX * spriterObject.width;
        var y = -1 * (1 - spriterObject.pivotY) * spriterObject.height;
		
        var s = 0;
        var c = 1;

        if (spriterObject.angle != 0)
        {
            s = Math.sin(spriterObject.angle);
            c = Math.cos(spriterObject.angle);
        }
		
        var xnew = (x * c) - (y * s);
        var ynew = (x * s) + (y * c);

		inst.SetXY(xnew + spriterObject.x, ynew + spriterObject.y);
    };
	
	function ApplySpriterObjectToInst(inst, spriterObject)
	{
		ApplySpriterObjectToInstPosition(inst, spriterObject);
		inst.SetSize(spriterObject.width, spriterObject.height);
		inst.SetAngle(spriterObject.angle);
		inst.SetOpacity(spriterObject.alpha);
		inst.SetPropertyValue("initial-frame", spriterObject.startingFrame);
	}
	
	function SetFrameToImageBlob(frame) 
	{
		return function(imageBlob) 
		{
			frame.ReplaceBlobAndDecode(imageBlob);
		}		
	}
	
	async function ImportBoxData(zipFile, opts, obj_info, scmlObjectType, c2ObjectTypes, objectTypeNamePairs)
	{
		// Read the basic details about the drop location and the relevant project.
		const layoutView = opts.layoutView;
		const project = layoutView.GetProject();
		
		const name = obj_info["name"];
		
		var objectType = project.GetObjectTypeByName(scmlObjectType.GetName() + "_" + name);
		if(!objectType)
		{
			objectType = await project.CreateObjectType("Sprite", scmlObjectType.GetName() + "_" + name);
		}		
		
		objectTypeNamePairs.push(ObjectTypeNamePair(objectType, name));
		
		const animations = objectType.GetAnimations();
		const firstAnim = animations[0];
		const frames = firstAnim.GetFrames();
		const firstFrame = frames[0];
		firstFrame.SetOriginX(0);
		firstFrame.SetOriginY(0);
		
		var mycanvas = document.createElement("canvas");
		mycanvas.width=16;
		mycanvas.height=16;
		mycanvas.toBlob(SetFrameToImageBlob(firstFrame));		
		
		const wi = objectType.CreateWorldInstance(layoutView.GetActiveLayer());
		wi.SetXY(opts.layoutX, opts.layoutY);
		wi.SetSize(16, 16);
		
		c2ObjectTypes.push(objectType);
	}
	
	const PLUGIN_CLASS = SDK.Plugins.Spriter = class Spriter extends SDK.IPluginBase
	{
		constructor()
		{
			super(PLUGIN_ID);
			SDK.Lang.PushContext("plugins." + PLUGIN_ID.toLowerCase());
			this._info.SetIcon("icon.png", "image/png");
			this._info.SetName(lang(".name"));
			this._info.SetDescription(lang(".description"));
			this._info.SetVersion(PLUGIN_VERSION);
			this._info.SetCategory(PLUGIN_CATEGORY);
			this._info.SetAuthor("BrashMonkey");
			this._info.SetHelpUrl(lang(".help-url"));
			this._info.SetPluginType("world");
			this._info.SetIsResizable(true);
			this._info.SetIsRotatable(true);
			//this._info.SetHasImage(true);
			this._info.SetSupportedRuntimes(["c2", "c3"]);
			this._info.SetHasAnimations(true);
			this._info.SetIsTiled(false);
			this._info.SetIsSingleGlobal(false);
			this._info.SetIsDeprecated(false);
			this._info.SetSupportsEffects(true);		// allow effects
			this._info.SetMustPreDraw(true);
			this._info.SetCanBeBundled(false);
			this._info.AddCommonPositionACEs();
			this._info.AddCommonAngleACEs();
			this._info.AddCommonAppearanceACEs();
			this._info.AddCommonZOrderACEs();
			this._info.AddCommonSceneGraphACEs();
			SDK.Lang.PushContext(".properties");
			this._info.SetProperties([
				new SDK.PluginProperty("text", "scml-file", ""),
				new SDK.PluginProperty("text", "starting-entity", ""),
				new SDK.PluginProperty("text", "starting-animation", ""),
				new SDK.PluginProperty("float", "starting-opacity", 100),
				new SDK.PluginProperty("combo", "draw-self", {initialValue: "false",
				items:["false","true"]}),
				new SDK.PluginProperty("text", "nickname-in-c2", ""),
				new SDK.PluginProperty("combo", "blend-mode", {initialValue : "no premultiplied alpha blend",
				items:["no premultiplied alpha blend","use effects blend mode"]})
			]);
			SDK.Lang.PopContext();		// .properties
			SDK.Lang.PopContext();
			
			this.firstFrame = {};
			SDK.UI.Util.AddDragDropFileImportHandler(ImportSconFile, {
				isZipFormat: true,			// second callback parameter will be IZipFile
				toLayoutView: true			// third callback parameter will have layout view related info
			});
			
		}
	};
	PLUGIN_CLASS.Register(PLUGIN_ID, PLUGIN_CLASS);
	
	
}
