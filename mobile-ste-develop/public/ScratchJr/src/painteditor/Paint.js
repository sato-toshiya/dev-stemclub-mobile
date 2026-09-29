import ScratchJr from "../editor/ScratchJr"
import BlockSpecs from "../editor/blocks/BlockSpecs"
import Alert from "../editor/ui/Alert"
import Vector from "../geom/Vector"
import IO from "../tablet/IO"
import MediaLib from "../tablet/MediaLib"
import OS from "../tablet/OS"
import Events from "../utils/Events"
import Localization from "../utils/Localization"
import SVG2Canvas from "../utils/SVG2Canvas"
import ScratchAudio from "../utils/ScratchAudio"
import {
  frame,
  getIdFor,
  gn,
  hitRect,
  isAndroid,
  isTablet,
  newHTML,
  onTouchEndBind,
  onTouchMoveBind,
  onTouchStartBind,
  setCanvasSize,
  setProps,
} from "../utils/lib"
import Camera from "./Camera"
import Ghost from "./Ghost"
import PaintAction from "./PaintAction"
import PaintUndo from "./PaintUndo"
import Path from "./Path"
import SVGTools from "./SVGTools"
import Transform from "./Transform"

// Originally several files (Paint.js, PaintIO.js, PaintLayout.js)
// were all contributing utility functions to the Paint object.
// To consolidate it into a single module, I've combined these below.
// A nice refactor would be to split them back into the "modules," but that will likely involve
// some serious code changes - determining where the relevant Paint.X are called, if any shared
// data needs to be moved, etc. -TM
let xmlns = "http://www.w3.org/2000/svg"
let xmlnslink = "http://www.w3.org/1999/xlink"
let fillcolor = "#080808"
let workspaceWidth = 432
let workspaceHeight = 384
let mode = "select"
let pensizes = [1, 2, 4, 8, 16]

let strokewidth = 15
let spriteId
let currentName
let costumeScale
let nativeJr
let isBkg = false
let currentMd5 = undefined
let currentZoom = 1
let root
let saving = false
let paintFrame
let saveMD5 = undefined
let svgdata = undefined //当前svg数据
let splash
let splashshade
let maxZoom = 5
let minZoom = 1
let initialPoint = {
  x: 0,
  y: 0,
}
let deltaPoint = {
  x: 0,
  y: 0,
}

export default class Paint {
  static get xmlns() {
    return xmlns
  }

  static get xmlnslink() {
    return xmlnslink
  }

  static get fillcolor() {
    return fillcolor
  }

  static get workspaceWidth() {
    return workspaceWidth
  }

  static get workspaceHeight() {
    return workspaceHeight
  }

  static get mode() {
    return mode
  }

  static set mode(newMode) {
    mode = newMode
  }

  static get strokewidth() {
    return strokewidth
  }

  static get currentZoom() {
    return currentZoom
  }

  static set currentZoom(newCurrentZoom) {
    currentZoom = newCurrentZoom
  }

  static get root() {
    return root
  }

  static get saving() {
    return saving
  }

  static get frame() {
    return paintFrame
  }

  static get splash() {
    return splash
  }

  static get splashshade() {
    return splashshade
  }

  static get initialPoint() {
    return initialPoint
  }

  static set initialPoint(newInitialPoint) {
    initialPoint = newInitialPoint
  }

  static get deltaPoint() {
    return deltaPoint
  }

  static set deltaPoint(newDeltaPoint) {
    deltaPoint = newDeltaPoint
  }

  static toString() {
    return (
      'Paint mode:"' +
      Paint.mode +
      '" currentZoom:' +
      Paint.currentZoom +
      " initialPoint:" +
      Paint.pointStr(Paint.initialPoint) +
      ",deltaPoint:" +
      Paint.pointStr(Paint.deltaPoint)
    )
  }

  static pointStr(pt) {
    return "[" + Math.round(pt.x) + "," + Math.round(pt.y) + "]"
  }

  ///////////////////////////////////////////
  //Opening and Layout
  ///////////////////////////////////////////

  static init(w, h) {
    paintFrame = document.getElementById("paintframe")
    paintFrame.style.width = w + "px"
    paintFrame.style.height = h + "px"
    BlockSpecs.loadCount++
    IO.requestFromServer("assets/paint/splash.svg", Paint.setSplash)
    BlockSpecs.loadCount++
    IO.requestFromServer("assets/paint/splashshade.svg", Paint.setSplashShade)
  }

  static setSplash(str) {
    BlockSpecs.loadCount--
    splash = str
  }

  static setSplashShade(str) {
    BlockSpecs.loadCount--
    splashshade = "data:image/svg+xml;base64," + btoa(str)
  }

  static open(bkg, md5, sname, cname, cscale, sw, sh) {
    let action = ""
    let label = ""
    // Analytics:
    // * md3: name of the asset, an md5 hash for user generated, filename for library items
    // * sname: is not set for a new character (ignored for backgrounds)
    // log two events:
    // * paint editor is opened
    // * type of edit (edit_background, edit_character, new_character)
    OS.analyticsEvent("paint_editor", "paint_editor_open")
    if (bkg) {
      action = "edit_background"
      label = md5 in MediaLib.keys ? md5 : "user_background"
    } else {
      action = sname ? "edit_character" : "new_character"
      label = md5 in MediaLib.keys ? md5 : "user_character"
    }
    OS.analyticsEvent("paint_editor", action, label)
    PaintUndo.buffer = []
    PaintUndo.index = 0
    maxZoom = 5
    minZoom = 1
    workspaceWidth = 432
    workspaceHeight = 384
    Paint.clearWorkspace()
    frame.style.display = "none"
    paintFrame.className = "paintframe appear"
    currentMd5 = md5
    isBkg = bkg
    spriteId = sname
    currentName = cname
    costumeScale = cscale
    SVGTools.init()
    nativeJr = true
    if (isBkg) {
      Paint.initBkg(480, 360)
    } else {
      Paint.initSprite(sw, sh)
    }
    onTouchStartBind(window, Paint.detectGesture)
    window.ondevicemotion = undefined

    // Set the back button callback
    ScratchJr.onBackButtonCallback.push(function () {
      var e = document.createEvent("TouchEvent")
      e.initTouchEvent()
      Paint.backToProject(e)
    })
  }

  //Paint Editor Gestures

  static blockGestures(e) {
    if (!e.touches) {
      return
    }
    if (e.touches.length == 4) {
      Paint.ignore(e)
    }
  }

  static detectGesture(e) {
    if (isTablet && !e.touches) {
      return
    }
    if (Camera.active) {
      return
    }
    Paint.clearEvents(e)
    initialPoint = PaintAction.getScreenPt(e)
    deltaPoint = PaintAction.getScreenPt(e)
    var n = 1
    if (isTablet) n = Math.min(3, e.touches.length)
    var cmdForGesture = [Paint.ignore, Paint.mouseDown, Paint.pinchStart, Paint.Scroll]
    cmdForGesture[n](e)
  }

  static clearEvents(e) {
    onTouchMoveBind(window, undefined)
    onTouchEndBind(window, undefined)
    if (PaintAction.currentshape) {
      PaintAction.stopAction(e)
    }
    Events.clearEvents()
    PaintAction.clearEvents()
  }

  static ignore(e) {
    e.preventDefault()
    e.stopPropagation()
  }

  static Scroll(e) {
    e.preventDefault()
    e.stopPropagation()
    if (Paint.canvasFits()) {
      return
    }
    Ghost.clearLayer()
    initialPoint = PaintAction.getScreenPt(e)
    onTouchMoveBind(window, function (evt) {
      Paint.dragBackground(evt)
    })
    onTouchEndBind(window, function () {
      Paint.bounceBack()
      Paint.setCanvasTransform(currentZoom)
      PaintAction.clearEvents()
    })
  }

  static pinchStart(e) {
    e.preventDefault()
    e.stopPropagation()
    if (PaintAction.currentshape) {
      return
    }
    onTouchMoveBind(window, function () {
      Paint.gestureStart(e)
    })
  }

  static gestureStart(e) {
    onTouchMoveBind(window, undefined)
    var skipmodes = ["path", "ellipse", "rect"]
    if (skipmodes.indexOf(mode) > -1) {
      if (PaintAction.currentshape && PaintAction.currentshape.parentNode) {
        PaintAction.currentshape.parentNode.removeChild(PaintAction.currentshape)
      }
    }
    Ghost.clearLayer()
    Events.scaleStartsAt = currentZoom
    Events.updatePinchCenter(e)
    initialPoint = PaintAction.zoomPt(Events.pinchcenter)
    Events.clearEvents()
    Events.clearDragAndDrop()
    onTouchMoveBind(window, Paint.gestureChange)
    onTouchEndBind(window, Paint.gestureEnd)
  }

  static gestureChange(e) {
    e.preventDefault()
    var scale = Math.min(maxZoom, Events.scaleStartsAt * Events.zoomScale(e))
    scale = Math.max(minZoom, scale)
    var mc = gn("maincanvas")
    var w = mc.offsetWidth * scale
    var h = mc.offsetHeight * scale
    var size = Math.min(w, h)
    if (size < 240) {
      return
    }
    Paint.updateZoomScale(scale)
    var pt = PaintAction.zoomPt(Events.pinchcenter)
    var delta = Vector.diff(pt, initialPoint)
    Paint.adjustPos(delta)
  }

  static gestureEnd(e) {
    e.preventDefault()
    onTouchMoveBind(window, undefined)
    onTouchEndBind(window, undefined)
    var scale = Math.min(maxZoom, Events.scaleStartsAt * Events.zoomScale(e))
    scale = Math.max(minZoom, scale)
    Paint.updateZoomScale(scale)
    var pt = PaintAction.zoomPt(Events.pinchcenter)
    var delta = Vector.diff(pt, initialPoint)
    Paint.adjustPos(delta)
    Events.scaleStartsAt = currentZoom
    if (Path.selector) {
      Path.showDots(Path.selector)
    }
    Paint.setZoomTo(scale)
  }

  static canvasFits() {
    return (
      gn("maincanvas").offsetWidth * currentZoom <= gn("workspacebkg").offsetWidth &&
      gn("maincanvas").offsetHeight * currentZoom <= gn("workspacebkg").offsetHeight
    )
  }

  static mouseDown(e) {
    if ((isTablet && e.target.onmousedown) || e.target.onmousedown) {
      return
    }
    var pt = Events.getTargetPoint(e)
    if (hitRect(gn("donecheck"), pt)) {
      Paint.backToProject(e)
    } else {
      if (e.target.parentNode && e.target.parentNode.getAttribute("key")) {
        return
      } else {
        PaintAction.mouseDown(e)
      }
    }
  }

  static close() {
    OS.analyticsEvent("paint_editor", "paint_editor_close")
    saving = true
    Paint.hideWeightSliderPopover()
    paintFrame.className = "paintframe disappear"
    frame.style.display = "block"
    ScratchJr.editorEvents()
    onTouchMoveBind(window, undefined)
    onTouchEndBind(window, undefined)
    Alert.close()
    Paint.clearWorkspace()
    PaintUndo.buffer = []
    PaintUndo.index = 0
    Ghost.maskData = {}
    setTimeout(function () {
      saving = false
    }, 500) // delay so it doesn't open the info box
  }

  static backToProject(e) {
    e.preventDefault()
    e.stopPropagation()
    if (saving) {
      return
    }
    if (PaintAction.dragGroup.length > 0) {
      return
    }
    if (e.touches && e.touches.length > 1) {
      return
    }
    Path.quitEditMode()
    Camera.close()
    PaintAction.clearDragGroup()
    ScratchJr.unfocus()
    ScratchAudio.sndFX("tap.wav")
    if (spriteId == null && currentName == null) {
      Paint.savePageImage(Paint.changePage)
    } else {
      Paint.saveSprite(Paint.changePageSprite)
    }
    ScratchJr.onBackButtonCallback.pop()
  }

  static saveEditState() {
    Camera.close()
    ScratchJr.unfocus()
    ScratchAudio.sndFX("tap.wav")
    if (spriteId == null && currentName == null) {
      Paint.savePageImage()
    } else {
      Paint.saveSprite()
    }
  }

  /////////////////////////
  //Modes
  /////////////////////////

  static setMode(e) {
    if (e.touches && e.touches.length > 1) {
      return
    }
    e.preventDefault()
    var t
    if (window.event) {
      t = window.event.srcElement
    } else {
      t = e.target
    }
    if (t == null) {
      return
    }
    Path.quitEditMode()
    if (Camera.active) {
      Camera.doAction(t.getAttribute("key"))
    } else {
      var toolKey = t.getAttribute("key")
      var paintTools = ["path", "ellipse", "rect", "tri"]

      // Show weight slider popover for paint tools
      if (paintTools.indexOf(toolKey) > -1) {
        Paint.showWeightSliderPopover(t)
        Paint.hideOpacitySliderPopover()
      } else if (toolKey === "opacity") {
        Paint.showOpacitySliderPopover(t)
        Paint.hideWeightSliderPopover()
      } else {
        Paint.hideWeightSliderPopover()
        Paint.hideOpacitySliderPopover()
      }

      var tools = ["select", "rotate", "stamper", "scissors", "opacity", "camera", "paintbucket"]
      if (tools.indexOf(toolKey) > -1) {
        ScratchAudio.sndFX("tap.wav")
      }
      Paint.selectButton(toolKey)
    }
  }

  static selectButton(str) {
    Paint.selectButtonFromDiv(gn("painttools"), str)
    Paint.selectButtonFromDiv(gn("selectortools"), str)
    Paint.selectButtonFromDiv(gn("edittools"), str)
    Paint.selectButtonFromDiv(gn("filltools"), str)
    if (gn("stamps")) {
      Paint.selectButtonFromDiv(gn("stamps"), str)
    }
    mode = str
    Paint.selectPenSize(strokewidth)
    // Show/hide opacity popover
    if (str == "opacity") {
      // Opacity popover is shown in setMode, but ensure old slider is hidden
      Paint.hideOpacitySlider()
    } else {
      Paint.hideOpacitySliderPopover()
      Paint.hideOpacitySlider()
    }

    // Hide weight slider popover if not a paint tool
    var paintTools = ["path", "ellipse", "rect", "tri"]
    if (paintTools.indexOf(str) === -1) {
      Paint.hideWeightSliderPopover()
    }
  }

  static selectButtonFromDiv(p, str) {
    for (var i = 0; i < p.childElementCount; i++) {
      var elem = p.childNodes[i]
      if (elem.childNodes[0].getAttribute("key") == str) {
        elem.setAttribute("class", Paint.getClass(elem, "on"))
        if (elem.childNodes[0].getAttribute("class")) {
          elem.childNodes[0].setAttribute("class", Paint.getClass(elem.childNodes[0], "on"))
        }
      } else {
        elem.setAttribute("class", Paint.getClass(elem, "off"))
        if (elem.childNodes[0].getAttribute("class")) {
          elem.childNodes[0].setAttribute("class", Paint.getClass(elem.childNodes[0], "off"))
        }
      }
    }
  }

  static getClass(elem, state) {
    var list = elem.getAttribute("class").split(" ")
    list.pop()
    list.push(state)
    return list.join(" ")
  }

  //Zoom Management
  ///////////////////////////////////////////

  static setZoomTo(value) {
    currentZoom = value
    Paint.bounceBack()
    Paint.setCanvasTransform(value)
    Ghost.drawOffscreen()
  }

  static updateZoomScale(value) {
    currentZoom = value
    Paint.setCanvasTransform(value)
  }

  static setCanvasTransform(value) {
    if (isAndroid) {
      // Use 3D translate to increase speed
      // gn('maincanvas').style.webkitTransform = 'translate3d(' + gn('maincanvas').dx + 'px,'
      //     + gn('maincanvas').dy + 'px, 0px) scale(' + value + ',' + value + ')';
      gn("maincanvas").style.webkitTransform =
        "translate3d(-50%,-50%, 0px) scale(" + value + "," + value + ")"
    } else {
      // Use 2D translate to maintain sharpness
      // gn('maincanvas').style.webkitTransform = 'translate(' + gn('maincanvas').dx + 'px,'
      //     + gn('maincanvas').dy + 'px) scale(' + value + ',' + value + ')';
      gn("maincanvas").style.webkitTransform =
        "translate(-50%,-50%) scale(" + value + "," + value + ")"
    }
  }

  static adjustPos(delta) {
    gn("maincanvas").dx += delta.x
    gn("maincanvas").dy += delta.y
    Paint.setCanvasTransform(currentZoom)
  }

  static bounceBack() {
    var mx = Math.floor((gn("workspacebkg").offsetWidth - workspaceWidth) / 2)
    var my = Math.floor((gn("workspacebkg").offsetHeight - workspaceHeight) / 2)
    gn("maincanvas").dx = Paint.canvasFits() ? mx : Paint.getCoorx(20, mx)
    gn("maincanvas").dy = Paint.canvasFits() ? my : Paint.getCoory(20, my)
  }

  static getCoorx(indent, val) {
    if (gn("maincanvas").offsetWidth * currentZoom <= gn("workspacebkg").offsetWidth) {
      return val
    }
    var dx = gn("maincanvas").dx + gn("maincanvas").cx - gn("maincanvas").cx * currentZoom
    if (dx > indent) {
      return gn("maincanvas").dx + (indent - dx)
    }
    val = (dx / currentZoom + gn("maincanvas").offsetWidth) * currentZoom
    var edge = gn("workspacebkg").offsetWidth - indent
    if (val < edge) {
      return gn("maincanvas").dx + (edge - val)
    }
    return gn("maincanvas").dx
  }

  static getCoory(indent, val) {
    if (gn("maincanvas").offsetHeight * currentZoom <= gn("workspacebkg").offsetHeight) {
      return val
    }
    var dy = gn("maincanvas").dy + gn("maincanvas").cy - gn("maincanvas").cy * currentZoom
    if (dy > indent) {
      return gn("maincanvas").dy + (indent - dy)
    }
    val = (dy / currentZoom + gn("maincanvas").offsetHeight) * currentZoom
    var edge = gn("workspacebkg").offsetHeight - indent
    if (val < edge) {
      return gn("maincanvas").dy + (edge - val)
    }
    return gn("maincanvas").dy
  }

  static scaleToFit() {
    var dh = root.parentNode.parentNode.offsetHeight / (workspaceHeight + 10)
    var dw = root.parentNode.parentNode.offsetWidth / (workspaceWidth + 10)
    Paint.setZoomTo(Math.min(dw, dh))
  }

  static dragBackground(evt) {
    if (Paint.canvasFits()) {
      return
    }
    var pt = PaintAction.getScreenPt(evt)
    var delta = Vector.diff(pt, initialPoint)
    Paint.adjustPos(delta)
  }

  /////////////////////////////////////////////////////////
  //dispatch table

  // Originally PaintLayout.js

  /////////////////////////////////
  //Layout Setup
  /////////////////////////////////

  static layout() {
    Paint.topbar()
    var div = newHTML("div", "innerpaint", paintFrame)
    div.setAttribute("id", "innerpaint")
    Paint.leftPalette(div)
    var workspaceContainer = newHTML("div", "workspacebkg-container", div)
    var workspace = newHTML("div", "workspacebkg", workspaceContainer)
    workspace.setAttribute("id", "workspacebkg")
    Paint.rightPalette(div)
    Paint.colorPalette(paintFrame)
    Paint.selectButton("path")
    Paint.createSVGeditor(workspace)
  }

  /////////////////////////////////
  //top bar
  /////////////////////////////////

  static topbar() {
    var pt = newHTML("div", "paintop", paintFrame)
    Paint.checkMark(pt)
    PaintUndo.setup(pt) // plug here the undo
    Paint.nameOfcostume(pt)
  }

  static checkMark(pt) {
    var clicky = newHTML("div", "paintdone", pt)
    clicky.id = "donecheck"
    if (isTablet) {
      clicky.ontouchstart = Paint.backToProject
    } else {
      clicky.onmousedown = Paint.backToProject
    }
  }

  static nameOfcostume(p) {
    var sform = newHTML("form", "spriteform", p)
    sform.name = "spriteform"
    var ti = newHTML("input", undefined, sform)
    ti.autocomplete = false
    ti.autocorrect = false
    ti.name = "name"
    ti.maxLength = 25
    ti.firstTime = true
    if (isTablet) {
      ti.ontouchstart = () => {}
    } else {
      ti.onmousedown = () => {}
    }
    ti.onfocus = Paint.nameFocus
    ti.onblur = Paint.nameBlur
    ti.onkeypress = Paint.handleNamePress
    ti.onkeyup = Paint.handleKeyRelease
    sform.onsubmit = Paint.submitNameChange
  }

  static submitNameChange(e) {
    e.preventDefault()
    var input = e.target
    input.blur()
  }

  static nameFocus(e) {
    e.preventDefault()
    e.stopPropagation()
    var ti = e.target
    ti.firstTime = true
    ScratchJr.activeFocus = ti
    if (isAndroid) {
      AndroidInterface.scratchjr_setsoftkeyboardscrolllocation(
        ti.getBoundingClientRect().top * window.devicePixelRatio,
        ti.getBoundingClientRect().bottom * window.devicePixelRatio,
      )
    }
    setTimeout(function () {
      ti.setSelectionRange(ti.value.length, ti.value.length)
    }, 1)
  }

  static nameBlur(e) {
    ScratchJr.activeFocus = undefined
    var spr = ScratchJr.getSprite()
    var ti = e.target
    var val = ScratchJr.validate(ti.value, spr.name)
    ti.value = val.substring(0, ti.maxLength)
    ScratchJr.storyStart("Paint.nameBlur")
  }

  static handleNamePress(e) {
    var key = e.keyCode || e.which
    if (key == 13) {
      Paint.submitNameChange(e)
    } else {
      var ti = e.target
      if (ti.firstTime) {
        ti.firstTime = false
        ti.value = ""
      }
      if (ti.value.length == 25) {
        ScratchAudio.sndFX("boing.wav")
      }
    }
  }

  static handleKeyRelease(e) {
    var key = e.keyCode || e.which
    var ti = e.target
    if (key != 8) {
      return
    }
    if (ti.firstTime) {
      ti.firstTime = false
      ti.value = ""
    }
  }

  /////////////////////////////////
  //Left Palette
  /////////////////////////////////

  static leftPalette(div) {
    var leftpal = newHTML("div", "side up", div)
    var pal = newHTML("div", "paintpalette", leftpal)
    pal.setAttribute("id", "paintpalette")
    Paint.setupEditPalette(pal)
    Paint.createWeightSliderPopover(paintFrame)
    Paint.createOpacitySliderPopover(paintFrame)
    Paint.initClickOutsideHandler()
  }

  static setupEditPalette(pal) {
    var section = newHTML("div", "section", pal)
    section.setAttribute("id", "painttools")
    var list = ["path", "ellipse", "rect", "tri"]
    var i = 0
    for (i = 0; i < list.length; i++) {
      var but = newHTML("div", "element off", section)
      var icon = newHTML("div", "tool " + list[i] + " off", but)
      icon.setAttribute("key", list[i])
      if (isTablet) {
        icon.ontouchstart = Paint.setMode
      } else {
        icon.onmousedown = Paint.setMode
      }
    }
  }

  static createWeightSliderPopover(container) {
    // Create popover container
    var popover = newHTML("div", "weight-slider-popover", container)
    popover.setAttribute("id", "weightSliderPopover")
    popover.style.display = "none"
    popover.style.position = "absolute"
    popover.style.zIndex = "10000"
    popover.style.pointerEvents = "auto"

    var textLabel = newHTML("div", "weight-slider-label", popover)
    textLabel.setAttribute("id", "weightSliderLabel")
    textLabel.textContent = "15px"
    textLabel.style.textAlign = "center"
    textLabel.style.marginBottom = "5px"
    textLabel.style.fontSize = "12px"
    textLabel.style.color = "#606060"
    textLabel.style.pointerEvents = "none"

    // var previewContainer = newHTML("div", "weight-slider-preview", popover)
    // previewContainer.setAttribute("id", "weightSliderPreview")
    // previewContainer.style.width = "280px"
    // previewContainer.style.height = "280px"
    // previewContainer.style.margin = "6px auto"
    // previewContainer.style.display = "flex"
    // previewContainer.style.alignItems = "center"
    // previewContainer.style.justifyContent = "center"
    // previewContainer.style.pointerEvents = "none"

    // var initialStrokeWidth = 4
    // var initialShape =
    //   '<line id="weightSliderPreviewShape" x1="50" y1="140" x2="230" y2="140" ' +
    //   'stroke="#606060" stroke-linecap="round" stroke-width="' +
    //   initialStrokeWidth +
    //   '" />'

    // previewContainer.innerHTML =
    //   '<svg id="weightSliderPreviewSvg" width="280" height="280" viewBox="0 0 280 280">' +
    //   initialShape +
    //   "</svg>"

    var weightSlider = newHTML("div", "weight-slider", popover)

    var img = newHTML("img", "", weightSlider)
    img.alt = "Stroke Width"
    img.src = "assets/categories/stroke-width.svg"

    // Create range input
    var input = newHTML("input", "", weightSlider)
    input.setAttribute("type", "range")
    input.setAttribute("min", "1")
    input.setAttribute("max", "70")
    input.setAttribute("step", "1")
    input.setAttribute("id", "strokeWidthSlider")
    input.setAttribute("value", 15)

    // Add event listener for input change
    var handleSliderChange = function (e) {
      var value = Number(e.target.value)
      Paint.selectPenSize(value)
      // Update text label
      var label = gn("weightSliderLabel")
      if (label) {
        label.textContent = value + "px"
      }
      // var previewShape = gn("weightSliderPreviewShape")
      // if (previewShape) {
      //   previewShape.setAttribute("stroke-width", value)
      // }
    }

    if (isTablet) {
      input.addEventListener(
        "touchstart",
        function (e) {
          e.stopPropagation()
          // Don't preventDefault - allow native input dragging
        },
        true,
      )
      input.addEventListener(
        "touchmove",
        function (e) {
          e.stopPropagation()
          // Don't preventDefault - allow native input dragging
        },
        true,
      )
      input.addEventListener(
        "touchend",
        function (e) {
          e.stopPropagation()
          // Don't preventDefault - allow native input dragging
        },
        true,
      )
    } else {
      input.addEventListener(
        "mousedown",
        function (e) {
          e.stopPropagation()
        },
        true,
      )
      input.addEventListener(
        "mousemove",
        function (e) {
          if (e.buttons === 1) {
            e.stopPropagation()
          }
        },
        true,
      )
    }

    // Use input event for both desktop and tablet - fires as slider is dragged
    input.addEventListener(
      "input",
      function (e) {
        e.stopPropagation()
        handleSliderChange(e)
      },
      true,
    )

    // Use change event for both desktop and tablet - fires when input is released
    input.addEventListener(
      "change",
      function (e) {
        e.stopPropagation()
        handleSliderChange(e)
      },
      true,
    )

    // Prevent clicks inside popover from closing it
    popover.addEventListener(
      isTablet ? "touchstart" : "mousedown",
      function (e) {
        e.stopPropagation()
      },
      true,
    )
  }

  // Static handler for click-outside detection (only add once)
  static initClickOutsideHandler() {
    if (Paint.clickOutsideHandlerInitialized) {
      return
    }
    Paint.clickOutsideHandlerInitialized = true

    var handleClickOutside = function (e) {
      var weightPopover = gn("weightSliderPopover")
      var opacityPopover = gn("opacitySliderPopover")
      var target = e.target || e.srcElement

      // Handle weight slider popover
      if (weightPopover && weightPopover.style.display !== "none") {
        var clickedInsideWeightPopover = weightPopover.contains(target)
        var clickedOnPaintTool = false

        // Check if clicked on a paint tool button
        if (target && target.getAttribute) {
          var toolKey = target.getAttribute("key")
          var paintTools = ["path", "ellipse", "rect", "tri"]
          if (paintTools.indexOf(toolKey) > -1) {
            clickedOnPaintTool = true
          }
          // Also check parent elements
          var parent = target.parentNode
          while (parent && parent !== document.body) {
            if (parent.getAttribute && parent.getAttribute("key")) {
              toolKey = parent.getAttribute("key")
              if (paintTools.indexOf(toolKey) > -1) {
                clickedOnPaintTool = true
                break
              }
            }
            parent = parent.parentNode
          }
        }

        if (!clickedInsideWeightPopover && !clickedOnPaintTool) {
          Paint.hideWeightSliderPopover()
        }
      }

      // Handle opacity slider popover
      if (opacityPopover && opacityPopover.style.display !== "none") {
        var clickedInsideOpacityPopover = opacityPopover.contains(target)
        var clickedOnOpacityTool = false

        // Check if clicked on opacity tool button
        if (target && target.getAttribute) {
          var toolKey = target.getAttribute("key")
          if (toolKey === "opacity") {
            clickedOnOpacityTool = true
          }
          // Also check parent elements
          var parent = target.parentNode
          while (parent && parent !== document.body) {
            if (parent.getAttribute && parent.getAttribute("key")) {
              toolKey = parent.getAttribute("key")
              if (toolKey === "opacity") {
                clickedOnOpacityTool = true
                break
              }
            }
            parent = parent.parentNode
          }
        }

        if (!clickedInsideOpacityPopover && !clickedOnOpacityTool) {
          Paint.hideOpacitySliderPopover()
        }
      }
    }

    // Add event listeners for click outside
    if (isTablet) {
      document.addEventListener("touchstart", handleClickOutside, true)
    } else {
      document.addEventListener("mousedown", handleClickOutside, true)
    }
  }

  static showWeightSliderPopover(toolElement) {
    var popover = gn("weightSliderPopover")
    if (!popover) {
      return
    }

    // Find the tool button element (might be icon or its parent)
    var toolButton = toolElement
    while (toolButton && toolButton.parentNode) {
      if (toolButton.className && toolButton.className.indexOf("element") > -1) {
        break
      }
      toolButton = toolButton.parentNode
    }

    if (!toolButton) {
      toolButton = toolElement
    }

    // Determine tool key (path / rect / ellipse / tri)
    var toolKey = null
    var node = toolElement
    while (node) {
      if (node.getAttribute && node.getAttribute("key")) {
        toolKey = node.getAttribute("key")
        break
      }
      node = node.parentNode
    }
    if (!toolKey) {
      toolKey = typeof mode !== "undefined" ? mode : "path"
    }

    // Paint.updateWeightSliderPreviewShape(toolKey)

    // Get position of the tool button
    var rect = toolButton.getBoundingClientRect()
    var paintFrameRect = paintFrame.getBoundingClientRect()

    // Update label with current stroke width value
    var label = gn("weightSliderLabel")
    if (label) {
      label.textContent = strokewidth + "px"
    }

    // Position popover to the right of the tool
    popover.style.display = "block"
    popover.style.left = rect.right - paintFrameRect.left + 10 + "px"
    var topPosition = rect.top - paintFrameRect.top + rect.height / 2
    popover.style.top = topPosition + "px"
    // popover.style.transform = "translateY(-50%)"

    void popover.offsetHeight
    var popoverRect = popover.getBoundingClientRect()
    var paintFrameBottom = paintFrameRect.top + paintFrameRect.height
    var popoverBottom = popoverRect.bottom

    if (popoverBottom > paintFrameBottom) {
      var overflow = popoverBottom - paintFrameBottom
      var newTop = topPosition - overflow - 10
      if (newTop < 0) {
        newTop = 10
      }
      popover.style.top = newTop + "px"
    }

    var popoverRight = popoverRect.right
    var paintFrameRight = paintFrameRect.left + paintFrameRect.width
    if (popoverRight > paintFrameRight) {
      var newLeft = rect.left - paintFrameRect.left - popoverRect.width - 10
      if (newLeft < 0) {
        newLeft = 10
      }
      popover.style.left = newLeft + "px"
    }
  }

  // static updateWeightSliderPreviewShape(toolKey) {
  //   var previewContainer = gn("weightSliderPreview")
  //   if (!previewContainer) {
  //     return
  //   }
  //   var width = typeof strokewidth !== "undefined" ? strokewidth : 4
  //   var shape
  //   if (toolKey === "rect") {
  //     // Rect: centered with padding for 70px stroke-width
  //     shape =
  //       '<rect id="weightSliderPreviewShape" x="50" y="60" width="180" height="160" ' +
  //       'fill="none" stroke="#606060" stroke-width="' +
  //       width +
  //       '" />'
  //   } else if (toolKey === "ellipse") {
  //     // Ellipse: centered with padding for 70px stroke-width
  //     shape =
  //       '<ellipse id="weightSliderPreviewShape" cx="140" cy="140" rx="90" ry="70" ' +
  //       'fill="none" stroke="#606060" stroke-width="' +
  //       width +
  //       '" />'
  //   } else if (toolKey === "tri") {
  //     // Triangle: centered with padding for 70px stroke-width
  //     shape =
  //       '<polygon id="weightSliderPreviewShape" points="50,240 140,60 230,240" ' +
  //       'fill="none" stroke="#606060" stroke-linejoin="round" stroke-width="' +
  //       width +
  //       '" />'
  //   } else {
  //     // default to path tool → simple line (centered vertically)
  //     shape =
  //       '<line id="weightSliderPreviewShape" x1="50" y1="140" x2="230" y2="140" ' +
  //       'stroke="#606060" stroke-linecap="round" stroke-width="' +
  //       width +
  //       '" />'
  //   }

  //   previewContainer.innerHTML =
  //     '<svg id="weightSliderPreviewSvg" width="280" height="280" viewBox="0 0 280 280">' +
  //     shape +
  //     "</svg>"
  // }

  static hideWeightSliderPopover() {
    var popover = gn("weightSliderPopover")
    if (popover) {
      popover.style.display = "none"
    }
  }

  static createOpacitySliderPopover(container) {
    // Create popover container
    var popover = newHTML("div", "opacity-slider-popover", container)
    popover.setAttribute("id", "opacitySliderPopover")
    popover.style.display = "none"

    var textLabel = newHTML("div", "opacity-slider-label", popover)
    textLabel.setAttribute("id", "opacitySliderLabel")
    textLabel.textContent = "100%"

    var previewContainer = newHTML("div", "opacity-slider-preview", popover)
    previewContainer.setAttribute("id", "opacitySliderPreview")

    var initialOpacity = 100
    var initialShape =
      '<rect id="opacitySliderPreviewShape" x="10" y="10" width="80" height="80" ' +
      'fill="#606060" opacity="' +
      initialOpacity / 100 +
      '" />'

    previewContainer.innerHTML =
      '<svg id="opacitySliderPreviewSvg" width="100" height="100" viewBox="0 0 100 100">' +
      initialShape +
      "</svg>"

    var opacitySlider = newHTML("div", "opacity-slider", popover)

    var input = newHTML("input", "", opacitySlider)
    input.setAttribute("type", "range")
    input.setAttribute("min", "0")
    input.setAttribute("max", "100")
    input.setAttribute("step", "1")
    input.setAttribute("id", "opacitySliderInput")
    input.setAttribute("value", 100)

    var handleSliderChange = function (e) {
      var value = Number(e.target.value)
      var opacity = value / 100
      var label = gn("opacitySliderLabel")
      if (label) {
        label.textContent = value + "%"
      }
      var previewShape = gn("opacitySliderPreviewShape")
      if (previewShape) {
        previewShape.setAttribute("opacity", opacity)
      }
      if (window.currentSelectedShape) {
        PaintAction.applyOpacityToShape(window.currentSelectedShape, opacity)
      }
    }

    if (isTablet) {
      input.addEventListener(
        "touchstart",
        function (e) {
          e.stopPropagation()
        },
        true,
      )
      input.addEventListener(
        "touchmove",
        function (e) {
          e.stopPropagation()
        },
        true,
      )
      input.addEventListener(
        "touchend",
        function (e) {
          e.stopPropagation()
        },
        true,
      )
    } else {
      input.addEventListener(
        "mousedown",
        function (e) {
          e.stopPropagation()
        },
        true,
      )
      input.addEventListener(
        "mousemove",
        function (e) {
          if (e.buttons === 1) {
            e.stopPropagation()
          }
        },
        true,
      )
    }

    // Use input event for both desktop and tablet
    input.addEventListener(
      "input",
      function (e) {
        e.stopPropagation()
        handleSliderChange(e)
      },
      true,
    )

    // Use change event for both desktop and tablet
    input.addEventListener(
      "change",
      function (e) {
        e.stopPropagation()
        handleSliderChange(e)
        PaintUndo.record()
      },
      true,
    )

    // Prevent clicks inside popover from closing it
    popover.addEventListener(
      isTablet ? "touchstart" : "mousedown",
      function (e) {
        e.stopPropagation()
      },
      true,
    )
  }

  static showOpacitySliderPopover(toolElement) {
    var popover = gn("opacitySliderPopover")
    if (!popover) {
      return
    }

    // Find the tool button element
    var toolButton = toolElement
    while (toolButton && toolButton.parentNode) {
      if (toolButton.className && toolButton.className.indexOf("element") > -1) {
        break
      }
      toolButton = toolButton.parentNode
    }

    if (!toolButton) {
      toolButton = toolElement
    }

    var rect = toolButton.getBoundingClientRect()
    var paintFrameRect = paintFrame.getBoundingClientRect()

    var currentOpacity = 100
    if (window.currentSelectedShape) {
      var opacityAttr = window.currentSelectedShape.getAttribute("opacity")
      if (opacityAttr !== null && opacityAttr !== "") {
        currentOpacity = Math.round(parseFloat(opacityAttr) * 100)
      }
    }

    var slider = gn("opacitySliderInput")
    if (slider) {
      slider.value = currentOpacity
    }

    var label = gn("opacitySliderLabel")
    if (label) {
      label.textContent = currentOpacity + "%"
    }

    var previewShape = gn("opacitySliderPreviewShape")
    if (previewShape) {
      previewShape.setAttribute("opacity", currentOpacity / 100)
    }

    popover.style.display = "block"
    popover.style.left = rect.right - paintFrameRect.left + 10 + "px"
    var topPosition = rect.top - paintFrameRect.top + rect.height / 2
    popover.style.top = topPosition + "px"

    void popover.offsetHeight
    var popoverRect = popover.getBoundingClientRect()
    var paintFrameBottom = paintFrameRect.top + paintFrameRect.height
    var popoverBottom = popoverRect.bottom

    if (popoverBottom > paintFrameBottom) {
      var overflow = popoverBottom - paintFrameBottom
      var newTop = topPosition - overflow - 10
      if (newTop < 0) {
        newTop = 10
      }
      popover.style.top = newTop + "px"
    }

    var popoverRight = popoverRect.right
    var paintFrameRight = paintFrameRect.left + paintFrameRect.width
    if (popoverRight > paintFrameRight) {
      var newLeft = rect.left - paintFrameRect.left - popoverRect.width - 30
      if (newLeft < 0) {
        newLeft = 10
      }

      popover.style.left = newLeft + "px"
    }
  }

  static hideOpacitySliderPopover() {
    var popover = gn("opacitySliderPopover")
    if (popover) {
      popover.style.display = "none"
    }
  }

  ////////////////////////////////////////
  // Pen sizes
  ////////////////////////////////////////

  static drawPenSizeInColor(c) {
    c.style.background = fillcolor
  }

  static updateStrokes() {
    // Check if slider exists (new implementation)
    var slider = document.getElementById("strokeWidthSlider")
    if (slider) {
      // Slider implementation doesn't need color updates
      return
    }

    // Fallback for old pensizeholder implementation
    var div = gn("sizeSelector")
    if (!div) {
      return
    }
    for (var i = 0; i < div.childElementCount; i++) {
      var elem = div.childNodes[i]
      if (elem.childNodes && elem.childNodes[0]) {
        Paint.drawPenSizeInColor(elem.childNodes[0])
      }
    }
  }

  static selectPenSize(str) {
    // Update slider value if slider exists
    var slider = document.getElementById("strokeWidthSlider")
    if (slider) {
      // New behavior: str is the stroke width value (1-70)
      strokewidth = Number(str)
      // Ensure value is within slider range
      if (strokewidth < 1) strokewidth = 1
      if (strokewidth > 70) strokewidth = 70
      slider.value = strokewidth
      // Update text label
      var label = gn("weightSliderLabel")
      if (label) {
        label.textContent = strokewidth + "px"
      }
    } else {
      // Fallback for old pensizeholder elements (if they still exist)
      var p = gn("sizeSelector")
      if (!p) return
      for (var i = 0; i < p.childElementCount; i++) {
        var elem = p.childNodes[i]
        if (elem.key == str) {
          elem.setAttribute("class", "pensizeholder on")
        } else {
          elem.setAttribute("class", "pensizeholder off")
        }
      }
    }
  }

  /////////////////////////////////
  //Right Palette
  /////////////////////////////////

  static rightPalette(div) {
    var rightpal = newHTML("div", "side", div)
    Paint.addSidePalette(rightpal, "selectortools", ["select", "rotate"])
    Paint.addSidePalette(rightpal, "edittools", ["stamper", "scissors"])
    var fillToolsList = ["opacity"]
    if (OS.camera == "1" && Camera.available) {
      fillToolsList.push("camera")
    }
    var filltoolsPal = Paint.addSidePalette(rightpal, "filltools", fillToolsList)
    Paint.createOpacitySlider(filltoolsPal)
  }

  static addSidePalette(p, id, list) {
    var pal = newHTML("div", "paintpalette short", p)
    pal.setAttribute("id", id)
    for (var i = 0; i < list.length; i++) {
      var but = newHTML("div", "element off", pal)
      var icon = newHTML("div", "tool " + list[i] + " off", but)
      icon.setAttribute("key", list[i])
      onTouchStartBind(icon, Paint.setMode)
    }
    return pal
  }

  static cameraToolsOn() {
    gn("backdrop").setAttribute("class", "modal-backdrop fade dark")
    setProps(gn("backdrop").style, {
      display: "block",
    })
    var topbar = newHTML("div", "phototopbar", gn("backdrop"))
    topbar.setAttribute("id", "photocontrols")
    //  var actions = newHTML("div",'actions', topbar);
    //  var buttons = newHTML('div', 'photobuttons', actions);
    var fc = newHTML("div", "flipcamera", topbar)
    fc.setAttribute("id", "cameraflip")
    fc.setAttribute("key", "cameraflip")
    if (isAndroid && !AndroidInterface.scratchjr_has_multiple_cameras()) {
      fc.style.display = "none"
    }

    onTouchStartBind(fc, Paint.setMode)
    var captureContainer = newHTML("div", "snapshot-container", gn("backdrop"))
    captureContainer.setAttribute("id", "capture-container")
    var capture = newHTML("div", "snapshot", captureContainer)
    capture.setAttribute("id", "capture")
    capture.setAttribute("key", "camerasnap")
    onTouchStartBind(capture, Paint.setMode)
    var cc = newHTML("div", "cameraclose", topbar)
    cc.setAttribute("id", "cameraclose")
    onTouchStartBind(cc, Paint.closeCameraMode)
  }

  static closeCameraMode() {
    ScratchAudio.sndFX("exittap.wav")
    Camera.close()
    Paint.selectButton("select")
  }

  static cameraToolsOff() {
    gn("backdrop").setAttribute("class", "modal-backdrop fade")
    setProps(gn("backdrop").style, {
      display: "none",
    })
    if (gn("photocontrols")) {
      gn("photocontrols").parentNode.removeChild(gn("photocontrols"))
    }
    if (gn("capture")) {
      var captureContainer = gn("capture").parentNode
      var captureContainerParent = captureContainer.parentNode
      captureContainer.removeChild(gn("capture"))
      captureContainerParent.removeChild(gn("capture-container"))
    }
  }

  //////////////////////////////////
  // Opacity Slider
  //////////////////////////////////

  static createOpacitySlider(pal) {
    if (!pal) {
      return
    }
    var sliderContainer = newHTML("div", "opacity-slider-container", pal)
    sliderContainer.setAttribute("id", "opacitySelector")
    sliderContainer.style.display = "none"
    sliderContainer.style.marginTop = "5px"
    sliderContainer.style.padding = "5px"
    sliderContainer.style.width = "80%"
    sliderContainer.style.margin = "5px auto"
    sliderContainer.style.pointerEvents = "none"
    sliderContainer.style.position = "relative"
    sliderContainer.style.zIndex = "1"

    var label = newHTML("div", "opacity-label", sliderContainer)
    label.style.textAlign = "center"
    label.style.marginBottom = "5px"
    label.style.fontSize = "12px"
    label.style.color = "#606060"
    label.style.pointerEvents = "none"

    var slider = newHTML("input", "opacity-slider", sliderContainer)
    slider.setAttribute("type", "range")
    slider.setAttribute("min", "0")
    slider.setAttribute("max", "100")
    slider.setAttribute("value", "100")
    slider.setAttribute("step", "1")
    slider.style.width = "100%"
    slider.style.height = "20px"
    slider.style.pointerEvents = "auto"
    slider.style.position = "relative"
    slider.style.zIndex = "2"

    var valueDisplay = newHTML("div", "opacity-value", sliderContainer)
    valueDisplay.textContent = "100%"
    valueDisplay.style.textAlign = "center"
    valueDisplay.style.marginTop = "5px"
    valueDisplay.style.fontSize = "11px"
    valueDisplay.style.color = "#606060"
    valueDisplay.style.pointerEvents = "none"

    var updateOpacity = function () {
      var value = slider.value
      var opacity = value / 100
      valueDisplay.textContent = value + "%"
      if (window.currentSelectedShape) {
        PaintAction.applyOpacityToShape(window.currentSelectedShape, opacity)
      }
    }

    var stopProp = function (e) {
      e.stopPropagation()
    }

    sliderContainer.addEventListener("touchstart", stopProp, false)
    sliderContainer.addEventListener("touchmove", stopProp, false)
    sliderContainer.addEventListener("touchend", stopProp, false)
    sliderContainer.addEventListener("mousedown", stopProp, false)
    sliderContainer.addEventListener("mousemove", stopProp, false)
    sliderContainer.addEventListener("mouseup", stopProp, false)

    // Handle touch events for tablets - stop propagation but allow default behavior
    if (isTablet) {
      slider.addEventListener(
        "touchstart",
        function (e) {
          e.stopPropagation()
          // Don't preventDefault - allow native slider dragging
        },
        true,
      )
      slider.addEventListener(
        "touchmove",
        function (e) {
          e.stopPropagation()
          // Don't preventDefault - allow native slider dragging
        },
        true,
      )
      slider.addEventListener(
        "touchend",
        function (e) {
          e.stopPropagation()
          // Don't preventDefault - allow native slider dragging
        },
        true,
      )
    } else {
      slider.addEventListener(
        "mousedown",
        function (e) {
          e.stopPropagation()
        },
        true,
      )
      slider.addEventListener(
        "mousemove",
        function (e) {
          if (e.buttons === 1) {
            e.stopPropagation()
          }
        },
        true,
      )
    }

    // Use input event for both desktop and tablet - fires as slider is dragged
    slider.addEventListener(
      "input",
      function (e) {
        e.stopPropagation()
        updateOpacity()
      },
      true,
    )

    // Use change event for both desktop and tablet - fires when slider is released
    slider.addEventListener(
      "change",
      function (e) {
        e.stopPropagation()
        updateOpacity()
        PaintUndo.record()
      },
      true,
    )
  }

  static showOpacitySlider() {
    var slider = gn("opacitySelector")
    if (slider) {
      slider.style.display = "block"
      slider.style.pointerEvents = "none"
      var sliderInput = slider.querySelector(".opacity-slider")
      if (sliderInput) {
        sliderInput.style.pointerEvents = "auto"
      }
    }
  }

  static hideOpacitySlider() {
    var slider = gn("opacitySelector")
    if (slider) {
      slider.style.display = "none"
      slider.style.pointerEvents = "none"
    }
  }

  //////////////////////////////////
  // canvas Area
  //////////////////////////////////

  static setUpCanvasArea() {
    var workspace = gn("workspacebkg")
    var dx = Math.floor((workspace.offsetWidth - workspaceWidth) / 2)
    var dy = Math.floor((workspace.offsetHeight - workspaceHeight) / 2)
    var w = workspaceWidth
    var h = workspaceHeight

    var div = gn("maincanvas")
    div.style.background = "#F5F2F7"
    div.style.position = "absolute"
    div.style.top = "50%"
    div.style.left = "50%"

    div.style.width = w + "px"
    div.style.height = h + "px"
    div.cx = div.offsetWidth / 2
    div.cy = div.offsetHeight / 2
    div.dx = dx
    div.dy = dy

    root.setAttributeNS(null, "width", w)
    root.setAttributeNS(null, "height", h)
    Paint.drawGrid(w, h)
    PaintAction.clearEvents()
  }

  /////////////////////////////////
  //Color Palette
  /////////////////////////////////

  static colorPalette(div) {
    var swatchlist = Paint.initSwatchList()
    var spalContainer = newHTML("div", "swatchpalette-container", div)
    var spal = newHTML("div", "swatchpalette", spalContainer)
    spal.setAttribute("id", "swatches")
    for (var i = 0; i < swatchlist.length; i++) {
      var colour = newHTML("div", "swatchbucket", spal)
      // bucket
      var sf = newHTML("div", "swatchframe", colour)
      var sc = newHTML("div", "swatchcolor", sf)
      sc.style.background = swatchlist[i]
      //
      sf = newHTML("div", "splasharea off", colour)
      Paint.setSplashColor(sf, splash, swatchlist[i])
      Paint.addImageUrl(sf, splashshade)
      onTouchStartBind(colour, Paint.selectSwatch)
    }
    Paint.setSwatchColor(gn("swatches").childNodes[swatchlist.indexOf("#1C1C1C")])
  }

  static setSplashColor(p, str, color) {
    var dataurl = "data:image/svg+xml;base64," + btoa(str.replace(/#662D91/g, color))
    Paint.addImageUrl(p, dataurl)
  }

  static addImageUrl(p, url) {
    var img = document.createElement("img")
    img.src = url
    img.style.position = "absolute"
    p.appendChild(img)
  }

  static selectSwatch(e) {
    if (e.touches && e.touches.length > 1) {
      return
    }
    e.preventDefault()
    e.stopPropagation()
    if (Camera.active) {
      return
    }
    var t
    if (window.event) {
      t = window.event.srcElement
    } else {
      t = e.target
    }
    var b = "swatchbucket" != t.className
    while (b) {
      t = t.parentNode
      b = t && "swatchbucket" != t.className
    }
    if (!t) {
      return
    }
    ScratchAudio.sndFX("splash.wav")
    Paint.setSwatchColor(t)
  }

  static setSwatchColor(t) {
    var tools = ["select", "wand", "stamper", "scissors", "rotate"]
    if (t && tools.indexOf(mode) > -1) {
      Paint.selectButton("paintbucket")
    }
    var c = t.childNodes[0].childNodes[0].style.backgroundColor
    for (var i = 0; i < gn("swatches").childElementCount; i++) {
      var mycolor = gn("swatches").childNodes[i].childNodes[0].childNodes[0].style.backgroundColor
      if (c == mycolor) {
        gn("swatches").childNodes[i].childNodes[1].setAttribute("class", "splasharea on")
      } else {
        gn("swatches").childNodes[i].childNodes[1].setAttribute("class", "splasharea off")
      }
    }
    fillcolor = c
    Path.quitEditMode()
    Paint.updateStrokes()
  }

  static initSwatchList() {
    return [
      //	"#FF5500", // new orange
      "#FFD2F2",
      "#FF99D6",
      "#FF4583", // red pinks
      "#C30001",
      "#FF0023",
      "#FF8300",
      "#FFB200",
      "#FFF42E",
      "#FFF9C2", // pale yellow
      "#E2FFBD", //  pale green
      "#CFF500", // lime green
      "#50D823", // problematic
      //          "#2BFC49", // less problematic
      "#29C130",
      //          "#56C43B",  // ERROR?
      "#2BBF8A", // new green
      "#027607",
      "#114D24", //greens
      "#FFFFFF",
      "#CCDDE7",
      "#61787C",
      "#1C1C1C", // grays
      "#D830A3", // sarah's pink shoes border
      "#FF64E9", // purple pinks
      "#D999FF",
      " #A159D3", // vilote
      "#722696", // sarah's violet
      "#141463",
      "#003399",
      "#1D40ED",
      "#0079D3",
      "#009EFF",
      "#76C8FF",
      "#ACE0FD",
      "#11B7BC",
      "#21F9F3",
      "#C3FCFC",
      "#54311E",
      "#8E572A",
      "#E4B69D",
      "#FFCDA4",
      "#FFEDD7", // skin colors
    ]
  }

  /////////////////////////////////////////////////
  //  Setup SVG Editor
  ////////////////////////////////////////////////

  static createSVGeditor(container) {
    var div = newHTML("div", "maincanvas", container)
    div.setAttribute("id", "maincanvas")
    div.style.background = "#F5F2F7"
    div.style.position = "absolute"
    div.style.top = "50%"
    div.style.left = "50%"
    onTouchMoveBind(window, undefined)
    onTouchEndBind(window, undefined)
    root = SVGTools.create(div)
    root.setAttribute("class", "active3d")
    window.xform = Transform.getTranslateTransform()
    window.selxform = Transform.getTranslateTransform()
    var layer = SVGTools.createGroup(root, "layer1")
    layer.setAttribute("style", "pointer-events:visiblePainted")
    SVGTools.createGroup(root, "draglayer")
    SVGTools.createGroup(root, "paintgrid")
    gn("paintgrid").setAttribute("opacity", 0.5)
  }

  static clearWorkspace() {
    var fcn = function (div) {
      while (div.childElementCount > 0) {
        div.removeChild(div.childNodes[0])
      }
    }
    fcn(gn("layer1"))
    fcn(gn("paintgrid"))
    fcn(gn("draglayer"))
    Path.quitEditMode()
  }

  static drawGrid(w, h) {
    var attr, path
    if (!isBkg) {
      attr = {
        "d": Paint.getGridPath(w, h, 12),
        "id": getIdFor("gridpath"),
        "opacity": 1,
        "stroke": "#dcddde",
        "fill": "none",
        "stroke-width": 0.5,
      }
      path = SVGTools.addChild(gn("paintgrid"), "path", attr)
      path.setAttribute("style", "pointer-events:none;")
    }
    attr = {
      "d": Paint.getGridPath(w, h, isBkg ? 24 : 48),
      "id": getIdFor("gridpath"),
      "opacity": 1,
      "stroke": "#c1c2c3",
      "fill": "none",
      "stroke-width": 0.5,
    }
    path = SVGTools.addChild(gn("paintgrid"), "path", attr)
    path.setAttribute("style", "pointer-events:none;")
  }

  static getGridPath(w, h, gridsize) {
    var str = ""
    var dx = gridsize
    // vertical
    var cmd
    for (var i = 0; i < w / gridsize; i++) {
      cmd = "M" + dx + "," + 0 + "L" + dx + "," + h
      str += cmd
      dx += gridsize
    }
    var dy = gridsize
    // horizontal
    for (i = 0; i < h / gridsize; i++) {
      cmd = "M" + 0 + "," + dy + "L" + w + "," + dy
      str += cmd
      dy += gridsize
    }
    return str
  }

  // Originally PaintIO.js
  ///////////////////////////
  // Loading and saving
  //////////////////////////

  static initBkg(ow, oh) {
    nativeJr = true
    workspaceWidth = ow
    workspaceHeight = oh
    Paint.setUpCanvasArea()
    var dh = root.parentNode.parentNode.offsetHeight / (workspaceHeight + 10)
    var dw = root.parentNode.parentNode.offsetWidth / (workspaceWidth + 10)
    Paint.setZoomTo(Math.min(dw, dh))
    document.forms.spriteform.style.visibility = "hidden"
    if (currentMd5) {
      Paint.loadBackground(currentMd5)
    } else {
      var attr = {
        id: "staticbkg",
        opacity: 1,
        fixed: "yes",
        fill: ScratchJr.stagecolor,
      }
      var cmds = [
        ["M", 0, 0],
        ["L", 480, 0],
        ["L", 480, 360],
        ["L", 0, 360],
        ["L", 0, 0],
      ]
      attr.d = SVG2Canvas.arrayToString(cmds)
      SVGTools.addChild(gn("layer1"), "path", attr)
      Ghost.drawOffscreen()
      PaintUndo.record(true)
    }
  }

  static loadBackground(md5) {
    if (md5.indexOf("samples/") >= 0) {
      // Load sample asset
      Paint.loadChar(md5)
    } else if (!MediaLib.keys[md5]) {
      // Load user asset
      OS.getmedia(md5, nextStep)
    } else {
      // Load library asset
      Paint.getBkg(MediaLib.path + md5)
    }
    function nextStep(base64) {
      var str = atob(base64)
      IO.getImagesInSVG(str, function () {
        Paint.loadBkg(str)
      })
    }
  }

  static getBkg(url) {
    var xmlrequest = new XMLHttpRequest()
    xmlrequest.onreadystatechange = function () {
      if (xmlrequest.readyState == 4) {
        Paint.createBkgFromXML(xmlrequest.responseText)
      }
    }
    xmlrequest.open("GET", url, true)
    xmlrequest.send(null)
  }

  static loadBkg(str) {
    Paint.createBkgFromXML(str)
  }

  static createBkgFromXML(str) {
    nativeJr = str.indexOf("Scratch Jr") > -1
    str = str.replace(/>\s*</g, "><")
    var xmlDoc = new DOMParser().parseFromString(str, "text/xml")
    var extxml = document.importNode(xmlDoc.documentElement, true)
    var flat = Paint.skipUnwantedElements(extxml, [])
    for (var i = 0; i < flat.length; i++) {
      gn("layer1").appendChild(flat[i])
      if (flat[i].getAttribute("id") == "fixed") {
        flat[i].setAttribute("fixed", "yes")
      }
      flat[i].setAttribute("file", "yes")
    }
    Paint.doAbsolute(gn("layer1"))
    if (!nativeJr) {
      Paint.reassingIds(gn("layer1"))
    } // make sure there are unique mask names
    //	gn("layer1").childNodes[0].setAttribute('id', "staticbkg");
    var dh = root.parentNode.parentNode.offsetHeight / (workspaceHeight + 10)
    var dw = root.parentNode.parentNode.offsetWidth / (workspaceWidth + 10)
    Paint.setZoomTo(Math.min(dw, dh))
    PaintUndo.record(true)
    if (!nativeJr) {
      Paint.selectButton("paintbucket")
    }
  }

  static initSprite(ow, oh) {
    nativeJr = true
    document.forms.spriteform.style.visibility = "visible"
    document.forms.spriteform.name.value = gn(currentName)
      ? gn(currentName).owner.name
      : currentName
    if (ow) {
      workspaceWidth = ow
    }
    if (oh) {
      workspaceHeight = oh
    }
    if (currentMd5) {
      Paint.loadCharacter(currentMd5)
    } else {
      Paint.setUpCanvasArea()
      setCanvasSize(
        Ghost.maskCanvas,
        Math.round(Number(root.getAttribute("width")) * currentZoom),
        Math.round(Number(root.getAttribute("height")) * currentZoom),
      )
      var dh = root.parentNode.parentNode.offsetHeight / (workspaceHeight + 10)
      var dw = root.parentNode.parentNode.offsetWidth / (workspaceWidth + 10)
      Paint.setZoomTo(Math.min(dw, dh))
      PaintUndo.record(true)
    }
  }

  static loadCharacter(md5) {
    if (md5.indexOf("samples/") >= 0) {
      // Load sample asset
      Paint.loadChar(md5)
    } else if (!MediaLib.keys[md5]) {
      // Load user asset
      OS.getmedia(md5, nextStep)
    } else {
      // Load library asset
      Paint.loadChar(MediaLib.path + md5)
    }
    function nextStep(base64) {
      var str = atob(base64)
      IO.getImagesInSVG(str, function () {
        Paint.loadSprite(str)
      })
    }
  }

  static loadSprite(svg) {
    Paint.createCharFromXML(svg, currentName)
  }

  static loadChar(url) {
    var xmlrequest = new XMLHttpRequest()
    xmlrequest.onreadystatechange = function () {
      if (xmlrequest.readyState == 4) {
        Paint.createCharFromXML(xmlrequest.responseText, currentName)
      }
    }
    xmlrequest.open("GET", url, true)
    xmlrequest.send(null)
  }

  static adjustShapePosition(dx, dy) {
    window.xform.setTranslate(dx, dy)
    Transform.translateTo(gn("layer1"), window.xform)
  }

  ///////////////////////////////////
  // Saving
  /////////////////////////////////

  static savePageImage(fcn) {
    var worthsaving = gn("layer1").childElementCount > 0
    if (!worthsaving) {
      Paint.close()
    } else {
      saving = true
      if (fcn) {
        Alert.open(paintFrame, gn("donecheck"), Localization.localize("ALERT_SAVING"), "#28A5DA")
        Alert.balloon.style.zIndex = 12000
      }
      svgdata = SVGTools.saveBackground(gn("layer1"), workspaceWidth, workspaceHeight)
      IO.setMedia(svgdata, "svg", function (str) {
        Paint.changeBackground(str, fcn)
      })
    }
  }

  static changeBackground(md5, fcn) {
    saveMD5 = md5
    var type = "userbkgs"
    var mobj = {}
    mobj.cond = "md5 = ? AND version = ?"
    mobj.items = ["*"]
    mobj.values = [saveMD5, ScratchJr.version]
    IO.query(type, mobj, function (str) {
      Paint.checkDuplicateBkg(str, fcn)
    })
  }

  static checkDuplicateBkg(str, fcn) {
    var list = JSON.parse(str)
    if (list.length > 0) {
      if (fcn) {
        fcn("duplicate")
      }
    } else {
      Paint.addToBkgLib(fcn)
    }
  }

  /////////////////////////////////////
  // userbkgs:  stores backgrounds
  /////////////////////////////////////
  /*
        [version] =>
        [md5] =>
        [altmd5] =>  //for PNG option
        [ext] => png / svg
          [width] =>
          [height] =>
    */

  static addToBkgLib(fcn) {
    var dataurl = IO.getThumbnail(svgdata, 480, 360, 120, 90)
    var pngBase64 = dataurl.split(",")[1]
    OS.setmedia(pngBase64, "png", setBkgRecord)
    function setBkgRecord(pngmd5) {
      var json = {}
      var keylist = ["md5", "altmd5", "version", "width", "height", "ext"]
      var values = "?,?,?,?,?,?"
      json.values = [saveMD5, pngmd5, ScratchJr.version, "480", "360", "svg"]
      json.stmt = "insert into userbkgs (" + keylist.toString() + ") values (" + values + ")"
      OS.stmt(json, fcn)
    }
  }

  static changePage() {
    ScratchJr.stage.currentPage.setBackground(saveMD5, ScratchJr.stage.currentPage.updateBkg)
    Paint.close()
  }

  static saveSprite(fcn) {
    var cname = document.forms.spriteform.name.value
    var worthsaving = gn("layer1").childElementCount > 0 && PaintUndo.index > 0
    if (worthsaving) {
      saving = true
      if (fcn) {
        Alert.open(paintFrame, gn("donecheck"), "Saving...", "#28A5DA")
        Alert.balloon.style.zIndex = 12000
      }
      svgdata = SVGTools.saveShape(gn("layer1"), workspaceWidth, workspaceHeight)
      IO.setMedia(svgdata, "svg", function (str) {
        Paint.addOrModifySprite(str, fcn)
      })
    } else {
      var type = Paint.getLoadType(spriteId, cname)
      if (cname != currentName && type == "modify") {
        ScratchJr.stage.currentPage.modifySpriteName(cname, spriteId)
      } else if (currentMd5 && type == "add") {
        ScratchJr.stage.currentPage.addSprite(costumeScale, currentMd5, cname)
      }
      Paint.close()
    }
  }

  static addOrModifySprite(str, fcn) {
    saveMD5 = str
    var mobj = {}
    mobj.cond = "md5 = ? AND version = ?"
    mobj.items = ["*"]
    mobj.values = [saveMD5, ScratchJr.version]
    IO.query("usershapes", mobj, function (str) {
      Paint.checkDuplicate(str, fcn)
    })
  }

  static checkDuplicate(str, fcn) {
    var list = JSON.parse(str)
    if (list.length > 0) {
      if (fcn) {
        fcn("duplicate")
      }
    } else {
      Paint.addToLib(fcn)
    }
  }

  /////////////////////////////////////
  // usershapes:  stores costumes
  /////////////////////////////////////
  /* current data
        [md5] =>
        [altmd5] =>  // for PNG  -- not used
        [version] =>
        [scale] =>
        [ext] => png / svg
          [width] =>
          [height] =>
        [name] =>

    */

  static addToLib(fcn) {
    var scale = "0.5" // always saves with 1/2 the size
    var cname = document.forms.spriteform.name.value
    cname = unescape(cname).replace(/[0-9]/g, "").replace(/\s*/g, "")
    var box = SVGTools.getBox(gn("layer1")).rounded()
    box = box.expandBy(20)
    var w = box.width.toString()
    var h = box.height.toString()
    var dataurl = IO.getThumbnail(svgdata, w, h, 120, 90)
    var pngBase64 = dataurl.split(",")[1]
    OS.setmedia(pngBase64, "png", setCostumeRecord)
    function setCostumeRecord(pngmd5) {
      var json = {}
      var keylist = ["scale", "md5", "altmd5", "version", "width", "height", "ext", "name"]
      var values = "?,?,?,?,?,?,?,?"
      json.values = [scale, saveMD5, pngmd5, ScratchJr.version, w, h, "svg", cname]
      json.stmt = "insert into usershapes (" + keylist.toString() + ") values (" + values + ")"
      OS.stmt(json, fcn)
    }
  }

  static changePageSprite() {
    Paint.close()
    var cname = document.forms.spriteform.name.value
    var type = Paint.getLoadType(spriteId, cname)
    switch (type) {
      case "modify":
        ScratchJr.stage.currentPage.modifySprite(saveMD5, cname, spriteId)
        break
      case "add":
        ScratchJr.stage.currentPage.addSprite(costumeScale, saveMD5, cname)
        break
      default:
        ScratchJr.stage.currentPage.update()
        break
    }
  }

  static getLoadType(sid, cid) {
    if (!cid) {
      return "none"
    }
    if (sid && cid) {
      return "modify"
    }
    return "add"
  }

  ///////////////////////////
  // XML import processs
  ///////////////////////////

  static skipUnwantedElements(p, res) {
    for (var i = 0; i < p.childNodes.length; i++) {
      var elem = p.childNodes[i]
      if (elem.nodeName == "metadata") {
        continue
      }
      if (elem.nodeName == "defs") {
        continue
      }
      if (elem.nodeName == "sodipodi:namedview") {
        continue
      }
      if (elem.nodeName == "#comment") {
        continue
      }
      if (elem.nodeName == "g" && elem.id == "layer1") {
        Paint.skipUnwantedElements(elem, res)
        if (elem.removeAttribute("id")) {
          elem.removeAttribute("id")
        }
      } else {
        res.push(elem)
      }
    }
    return res
  }

  static reassingIds(p) {
    for (var i = 0; i < p.childNodes.length; i++) {
      var elem = p.childNodes[i]
      if (elem.parentNode.getAttribute("fixed") == "yes") {
        elem.setAttribute("fixed", "yes")
      }
      var id = elem.getAttribute("id")
      if (!id) {
        elem.setAttribute("id", getIdFor(elem.nodeName))
      }
      if (elem.nodeName == "g") {
        Paint.reassingIds(elem)
      }
    }
  }

  static createCharFromXML(str) {
    nativeJr = str.indexOf("Scratch Jr") > -1
    var dx = workspaceWidth < 432 ? Math.floor((432 - workspaceWidth) / 2) : 0
    var dy = workspaceHeight < 384 ? Math.floor((384 - workspaceHeight) / 2) : 0
    if (workspaceWidth < 432) {
      workspaceWidth = 432
    }
    if (workspaceHeight < 384) {
      workspaceHeight = 384
    }
    Paint.setUpCanvasArea()
    str = str.replace(/>\s*</g, "><")
    var xmlDoc = new DOMParser().parseFromString(str, "text/xml")
    var extxml = document.importNode(xmlDoc.documentElement, true)
    var flat = Paint.skipUnwantedElements(extxml, [])
    for (var i = 0; i < flat.length; i++) {
      gn("layer1").appendChild(flat[i])
    }
    Paint.doAbsolute(gn("layer1"))
    Paint.adjustShapePosition(dx, dy)
    if (!nativeJr) {
      Paint.reassingIds(gn("layer1"))
    } // make sure there are unique mask names
    Paint.scaleToFit()
    minZoom = currentZoom < 1 ? currentZoom / 2 : 1
    var maxpix = 2290 * 2289 // Magic iOS max canvas size
    var ratio = maxpix / (workspaceWidth * workspaceHeight)
    var zoom = Math.floor(Math.sqrt(ratio))
    if (zoom < maxZoom) {
      maxZoom = zoom
    }
    PaintUndo.record(true)
    if (!nativeJr) {
      Paint.selectButton("paintbucket")
    }
  }

  static doAbsolute(div) {
    for (var i = 0; i < div.childElementCount; i++) {
      var elem = div.childNodes[i]
      if (elem.tagName == "path") {
        SVG2Canvas.setAbsolutePath(elem)
      }
      if (elem.tagName == "g") {
        Paint.doAbsolute(div.childNodes[i])
      }
    }
  }

  static getComponents(p, res) {
    for (var i = 0; i < p.childNodes.length; i++) {
      var elem = p.childNodes[i]
      if (elem.nodeName == "metadata") {
        continue
      }
      if (elem.nodeName == "defs") {
        continue
      }
      if (elem.nodeName == "sodipodi:namedview") {
        continue
      }
      if (elem.nodeName == "#comment") {
        continue
      }
      if (elem.nodeName == "g") {
        Paint.getComponents(elem, res)
        if (elem.getAttribute("id")) {
          elem.removeAttribute("id")
        }
      } else {
        res.push(elem)
      }
    }
    return res
  }
}
