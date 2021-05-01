# C3SpriterPlugin
BrashMonkey's Construct 3 addon for c3runtime and c2runtime.

## ISpriter documentation
This is the documentation to use Construct 3's new JavaScript [Scripting feature](https://www.construct.net/en/make-games/manuals/construct-3/scripting/overview) with Spriter Pro.

### Easy usage
You can easily access the Spriter object's interface using the `runtime`, from both the event sheet and script.
```JS
runtime.objects.Spriter.getFirstInstance().setAnimation("animationName", 0, 0);
```
For more information, please see the [scripting documentation of the Sprite object](https://www.construct.net/en/make-games/manuals/construct-3/scripting/scripting-reference/plugin-interfaces/sprite).

### Advanced usage
You can also subclass instances in a script, please see the [subclassing instances documentation](https://www.construct.net/en/make-games/manuals/construct-3/scripting/guides/subclassing-instances) for more information.
```JS
class PlayerInstance extends ISpriterInstance
{
	constructor()
	{
		super();
	}
}
```

### API
The supported methods and properties to use in Construct 3's scripting feature with Spriter Pro.

#### Globals
- Context - retrieve the current instance of the Spriter object.

#### Actions
- setPlaybackSpeedRatio(newSpeed)
- setVisible(visible)
- setOpacity(newOpacity)
- setAutomaticPausing(newPauseSetting, leftBuffer, rightBuffer, topBuffer, bottomBuffer)
- setObjectScaleRatio(newScale, xFlip, yFlip)
- setObjectXFlip(xFlip)
- setIgnoreGlobalTimeScale(ignore)
- findSpriterObject(c2Object)
- stopResumeSettingLayer(resume)
- stopResumeSettingVisibilityForObjects(resume)
- stopResumeSettingCollisionsForObjects(resume)
- setObjectYFlip(yFlip)
- setC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
- pinC2ObjectToSpriterObject(c2Object, propertiesToSet, spriterObjectName)
- unpinC2ObjectFromSpriterObject(c2Object, spriterObjectName)
- unpinAllFromSpriterObject(spriterObjectName)
- setAnimation(animName, startFrom, blendDuration)
- setSecondAnim(animName)
- stopSecondAnim()
- setAnimBlendRatio(newBlend)
- setEnt(entName, animName)
- playAnimTo(units, playTo)
- associateTypeWithName(type, name)
- setAnimationLoop(loopOn)
- setAnimationTime(units, time)
- pauseAnimation()
- resumeAnimation()
- removeAllCharMaps()
- appendCharMap(mapName)
- removeCharMap(mapName)
- overrideObjectComponent(objectName, component, newValue)
- overrideBonesWithIk(parentBoneName, childBoneName, targetX, targetY, additionalLength)

#### Conditions
- readyForSetup()
- outsidePaddedViewport()
- actionPointExists (pointName)
- objectExists (pointName)
- tagActive (tagName, objectName)
- CompareCurrentKey (cmp, frame)
- CompareCurrentTime (cmp, time, format)
- CompareAnimation (name)
- CompareSecondAnimation (name)
- CompareEntity (name)
- AnimationPaused()
- AnimationLooping()
- isMirrored()
- isFlipped()
- CompareZElevation(which, comparison, z_elevation)

#### Expressions
- time()
- val(varname, objectName)
- pointX(name)
- pointY(name)
- pointAngle(name)
- objectX(name)
- objectY(name)
- objectAngle(name)
- timeRatio()
- ScaleRatio()
- key()
- PlayTo()
- animationName()
- animationLength()
- speedRatio()
- secondAnimationName()
- entityName()
- PlayToTimeLeft()
- triggeredSound()
- triggeredSoundTag()
- soundVolume(soundTag)
- soundPanning(soundTag)
- blendRatio()
- Opacity()
- BBoxLeft()
- BBoxTop()
- BBoxRight()
- BBoxBottom()
- foundObject()
- ZElevation()
- TotalZElevation()

### In-Progress
Currently unsupported methods and properties.

#### Actions
- async LoadURL(url, crcrossOrigin)
- async loadFromURL(url, crossOrigin, sconText)


### Guide
The API documentation only shows the **methods** with its **parameters**, sometimes this is not enough to fully understand each use of the references.
To solve that, use the official **Spriter** addon as reference.

![image](https://user-images.githubusercontent.com/31282960/109700807-399c7880-7bcd-11eb-8769-4165f9887bd7.png)

**Instructions**
- For **text** parameters, use `string` values.
- For **number** parameters, use `int` or `float` values.
- For **combo** parameters, use the placement of the drop-down selection, starting from `0`.
