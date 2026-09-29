import ScratchJr from "../ScratchJr"
import OS from "../../tablet/OS"
import IO from "../../tablet/IO"
import MediaLib from "../../tablet/MediaLib"
import Paint from "../../painteditor/Paint"
import Events from "../../utils/Events"
import Localization from "../../utils/Localization"
import ScratchAudio from "../../utils/ScratchAudio"
import {
  gn,
  newHTML,
  scaleMultiplier,
  getDocumentWidth,
  getDocumentHeight,
  setProps,
  newCanvas,
  frame,
  onTouchStartBind,
  onTouchMoveBind,
  onTouchEndBind,
  capitalize,
} from "../../utils/lib"
import LibraryEx from "./LibraryEx"

let selectedOne
let nativeJr = true
let clickThumb
let shaking
let type
let timeoutEvent
let libFrame
let libEx

export default class Library {
  static init() {
    libFrame = document.getElementById("libframe")
    libFrame.style.minHeight = Math.max(getDocumentHeight(), frame.offsetHeight) + "px"
    var topbar = newHTML("div", "topbar", libFrame)
    topbar.setAttribute("id", "topbar")
    Library.createSearch(topbar)
    var actions = newHTML("div", "actions", topbar)
    actions.setAttribute("id", "libactions")
    var ascontainer = newHTML("div", "assetname-container", topbar)
    var as = newHTML("div", "assetname", ascontainer)
    var myname = newHTML("p", undefined, as)
    myname.setAttribute("id", "assetname")
    myname.textContent = ""
    Library.layoutHeader()
    Library.layoutTopbar()
    window.addEventListener("resize", Library.layoutTopbar)
  }

  static layoutTopbar() {
    var topbar = gn("topbar")
    var search = gn("search")
    var actions = gn("libactions")
    var actionButtons = actions ? actions.getElementsByClassName("bkgbuttons")[0] : null
    var assetContainer = topbar ? topbar.getElementsByClassName("assetname-container")[0] : null

    if (!topbar || !assetContainer) {
      return
    }

    var sideGap = 12 * scaleMultiplier
    var left = sideGap
    var right = sideGap
    var topbarRect = topbar.getBoundingClientRect()

    if (search) {
      var searchRect = search.getBoundingClientRect()
      left = searchRect.right - topbarRect.left + sideGap
    }

    if (actionButtons) {
      var actionsRect = actionButtons.getBoundingClientRect()
      right = Math.max(topbarRect.right - actionsRect.left + sideGap, sideGap)
    }

    assetContainer.style.display = "block"
    assetContainer.style.left = left + "px"
    assetContainer.style.right = right + "px"
  }

  static createScrollPanel() {
    var inner = newHTML("div", "innerlibrary", libFrame)
    inner.setAttribute("id", "asssetsview")
    Library.createClassification(inner)
    var div = newHTML("div", "scrollarea", inner)
    div.setAttribute("id", "scrollarea")
  }

  static createClassification(inner) {
    var classification = newHTML("div", "classification", inner)
    classification.setAttribute("id", "classification")
    var costumesArr = libEx.getCategory(type)
    // console.log('costumesArr',costumesArr)
    for (var i = 0; i < costumesArr.length; i++) {
      var item = newHTML("div", "classification-item", classification)
      item.textContent = costumesArr[i].category
      item.setAttribute("info", JSON.stringify(costumesArr[i]))
      if (i == 0) {
        item.className = "classification-item classification-active"
      }
    }
    var classificationItemArr = document.getElementsByClassName("classification-item")
    for (var i = 0; i < classificationItemArr.length; i++) {
      onTouchStartBind(classificationItemArr[i], function (item) {
        for (var k = 0; k < classificationItemArr.length; k++) {
          classificationItemArr[k].className = "classification-item"
        }
        this.className = "classification-item classification-active"
        var obj = JSON.parse(this.getAttribute("info"))
        var div = gn("scrollarea")
        div.innerHTML = ""
        if (obj.type == 1) Library.addUserData(div)
        let data = libEx.open(type, obj)
        Library.displayLibAssets(data)
      })
    }
  }

  static createSearch(inner) {
    var search = newHTML("div", "search", inner)
    search.setAttribute("id", "search")
    var input = newHTML("input", "search-input", search)
    input.setAttribute("required", "required")
    input.setAttribute("id", "search-input")
    input.setAttribute("placeholder", "けんさくしたいキーワードをいれてね")
    var a = newHTML("a", "clear-input", search)
    a.setAttribute("href", "javascript:;")
    a.setAttribute("id", "clear")
    var img = newHTML("img", "clear-input-img", a)
    img.src = "assets/ui/clear.png"
    var btn = newHTML("div", "search-btn", search)
    btn.setAttribute("id", "search-btn")
    btn.textContent = "検索"
    onTouchEndBind(gn("clear"), function () {
      gn("search-input").value = ""
      Library.resetType()
      gn("scrollarea").innerHTML = ""
      var data = libEx.open(type)
      Library.restoreDefaultResults(data)
    })

    onTouchEndBind(gn("search-btn"), function () {
      Library.resetType()
      var textSearch = gn("search-input").value ? gn("search-input").value : ""
      var data = libEx.seartch(type, null, capitalize(textSearch))
      if ((!data || data.length < 1) && textSearch != capitalize(textSearch)) {
        data = libEx.seartch(type, null, textSearch)
      }
      var userData = Library.searchUserData(textSearch)
      gn("scrollarea").innerHTML = ""
      Library.renderSearchResults(data, userData)
    })
  }

  static renderSearchResults(data, userData) {
    var hasUserData = userData && userData.length
    var hasLibraryData = data && data.length
    if (hasUserData) {
      Library.addUserData(null, userData, false)
    }
    if (hasLibraryData) {
      Library.displayLibAssets(data)
    }
    if (gn("noData")) {
      setProps(gn("noData").style, {
        display: hasUserData || hasLibraryData ? "none" : "block",
      })
    } else if (!hasUserData && !hasLibraryData) {
      Library.createNodata()
    }
  }

  static restoreDefaultResults(data) {
    var div = gn("scrollarea")
    var hasUserData = libEx.userData && libEx.userData.length
    var hasLibraryData = data && data.length
    if (hasUserData) {
      Library.addUserData(div)
    } else {
      Library.addHR(div)
    }
    if (hasLibraryData) {
      Library.displayLibAssets(data, div)
    }
    if (gn("noData")) {
      setProps(gn("noData").style, {
        display: hasUserData || hasLibraryData ? "none" : "block",
      })
    } else if (!hasUserData && !hasLibraryData) {
      Library.createNodata()
    }
  }

  static searchUserData(textSearch) {
    if (libEx.userData == null) return []
    var keyword = textSearch ? textSearch.trim().toLowerCase() : ""
    if (keyword.length < 1) return libEx.userData
    let userData = []
    for (var i = 0; i < libEx.userData.length; i++) {
      if (Library.matchUserData(libEx.userData[i], keyword)) {
        userData.push(libEx.userData[i])
      }
    }
    return userData
  }

  static matchUserData(data, keyword) {
    var assetData = Library.parseAssetData(data)
    var name = typeof assetData.name == "string" ? assetData.name.trim().toLowerCase() : ""
    if (!name) {
      return false
    }
    var keywords = keyword.split(/\s+/).filter(Boolean)
    if (!keywords.length) {
      return false
    }
    for (var i = 0; i < keywords.length; i++) {
      if (!name.includes(keywords[i])) {
        return false
      }
    }
    return true
  }

  static createNodata() {
    if (!gn("noData")) {
      var noData = newHTML("p", "noData", gn("scrollarea"))
      noData.setAttribute("id", "noData")
      noData.textContent = "検索結果が見つかりません。"
    }

    setProps(gn("noData").style, {
      display: "block",
    })
  }
  //重置type
  static resetType() {
    var classificationItemArr = document.getElementsByClassName("classification-item")
    for (var i = 0; i < classificationItemArr.length; i++) {
      classificationItemArr[i].className = "classification-item"
      if (i == 0) {
        classificationItemArr[i].className = "classification-item classification-active"
      }
    }
  }

  static open(libType) {
    type = libType
    libEx = new LibraryEx(null, null)
    gn("assetname").textContent = ""
    if (gn("search-input")) {
      gn("search-input").value = ""
    }
    if (gn("noData")) {
      setProps(gn("noData").style, {
        display: "none",
      })
    }

    nativeJr = true
    frame.style.display = "none"
    libFrame.className = "libframe appear"
    libFrame.focus()
    selectedOne = undefined
    let fun = type == "costumes" ? Library.closeSpriteSelection : Library.closeBkgSelection
    onTouchStartBind(gn("okbut"), fun)
    Library.clean()
    Library.createScrollPanel()
    Library.addThumbnails(type)

    requestAnimationFrame(function () {
      Library.layoutTopbar()
    })

    onTouchStartBind(window, undefined)
    onTouchEndBind(window, undefined)
    onTouchMoveBind(document, undefined)
    window.onresize = undefined

    gn("library_paintme").style.opacity = 1
    onTouchStartBind(gn("library_paintme"), Library.editResource)

    // Set the back button callback
    ScratchJr.onBackButtonCallback.push(function () {
      var e = document.createEvent("TouchEvent")
      e.initTouchEvent()
      Library.cancelPick(e)
    })
  }

  static clean() {
    if (gn("scrollarea")) {
      var div = gn("scrollarea").parentNode
      libFrame.removeChild(div)
    }
  }

  static close(e) {
    e.preventDefault()
    e.stopPropagation()
    ScratchAudio.sndFX("tap.wav")
    ScratchJr.blur()
    libFrame.className = "libframe disappear"
    document.body.scrollTop = 0
    frame.style.display = "block"
    ScratchJr.editorEvents()
    ScratchJr.onBackButtonCallback.pop()
  }

  static layoutHeader() {
    var buttons = newHTML("div", "bkgbuttons", gn("libactions"))
    var deleteall = newHTML("div", "deleteallicon", buttons)
    deleteall.setAttribute("id", "library_delete_all")
    deleteall.textContent = "いっかつさくじょ"
    onTouchEndBind(deleteall, function (evt) {
      evt.preventDefault()
      evt.stopPropagation()
      Library.confirmRemoveAllAssets()
    })
    var paintme = newHTML("div", "painticon", buttons)
    paintme.id = "library_paintme"
    onTouchStartBind(paintme, Library.editResource)
    var okbut = newHTML("div", "okicon", buttons)
    okbut.setAttribute("id", "okbut")
    var cancelbut = newHTML("div", "cancelicon", buttons)
    onTouchStartBind(cancelbut, Library.cancelPick)
    Library.refreshDeleteAllButton()
  }

  static cancelPick(e) {
    ScratchJr.onHold = true
    Library.close(e)
    setTimeout(function () {
      ScratchJr.onHold = false
    }, 1000)
  }

  static addThumbnails() {
    var div = gn("scrollarea")
    var key = type == "costumes" ? "usershapes" : "userbkgs"
    // Student' assets
    var json = {}
    json.cond = "ext = ? AND version = ?"
    json.items =
      type == "costumes"
        ? ["md5", "altmd5", "name", "scale", "width", "height"]
        : ["altmd5", "md5", "width", "height"]
    json.values = ["svg", ScratchJr.version]
    json.order = "ctime desc"
    IO.query(key, json, Library.displayAssets)
  }

  static skipUserAssets() {
    var div = gn("scrollarea")
    Library.addEmptyThumb(
      div,
      type == "costumes" ? 118 * scaleMultiplier : 120 * scaleMultiplier,
      type == "costumes" ? 90 * scaleMultiplier : 90 * scaleMultiplier,
    )
    Library.addHR(div)
    Library.displayLibAssets(type == "costumes" ? MediaLib.sprites : MediaLib.backgrounds)
  }

  static getpadding(div) {
    var w = Math.min(getDocumentWidth(), libFrame.offsetWidth)
    var dw = div.childNodes[1].offsetLeft - div.childNodes[0].offsetLeft
    var qty = Math.floor(w / dw)
    var pad = Math.floor((w - qty * dw) / 2)
    if (pad < 10) {
      return Math.floor((w - (qty - 1) * dw) / 2)
    }
    return pad
  }

  static addUserData(div, userData, showEmptyThumb) {
    if (userData == null) userData = libEx.userData
    if (showEmptyThumb == null) showEmptyThumb = true
    if (userData == null || userData.length < 1) return
    if (div == null) div = gn("scrollarea")
    if (showEmptyThumb) {
      Library.addEmptyThumb(
        div,
        type == "costumes" ? 118 * scaleMultiplier : 120 * scaleMultiplier,
        type == "costumes" ? 90 * scaleMultiplier : 90 * scaleMultiplier,
      )
    }
    nativeJr = true
    for (var i = 0; i < userData.length; i++) {
      Library.addAssetThumbChoose(
        div,
        userData[i],
        120 * scaleMultiplier,
        90 * scaleMultiplier,
        Library.selectAsset,
      )
    }
    if (showEmptyThumb) {
      Library.addHR(div)
    }
    nativeJr = false
  }

  static displayAssets(str) {
    var div = gn("scrollarea")
    var data = JSON.parse(str)
    if (data.length > 0) {
      libEx.userData = data
      Library.addUserData()
    } else {
      libEx.userData = []
      nativeJr = false
      Library.addHR(div)
    }
    Library.refreshDeleteAllButton()
    let libData = libEx.open(type)
    Library.displayLibAssets(libData)
  }

  static displayLibAssets(data, div) {
    if (div == null) div = gn("scrollarea")
    if (data.length < 1) {
      return
    }
    let nullOrder = []
    var order = data[0].order
    var key = order ? order.split(",")[1] : ""
    for (var i = 0; i < data.length; i++) {
      order = data[i].order
      if (order == null) {
        nullOrder.push(data[i])
        continue
      }
      var key2 = order ? order.split(",")[1] : ""
      if (key2 != key) {
        Library.addHR(div)
        key = key2
      }
      if ("separator" in data[i]) {
        Library.addHR(div)
      } else {
        Library.addLocalThumbChoose(
          div,
          data[i],
          120 * scaleMultiplier,
          90 * scaleMultiplier,
          Library.selectAsset,
        )
      }
    }

    for (var i = 0; i < nullOrder.length; i++) {
      Library.addLocalThumbChoose(
        div,
        nullOrder[i],
        120 * scaleMultiplier,
        90 * scaleMultiplier,
        Library.selectAsset,
      )
    }
  }

  static addAssetThumbChoose(parent, aa, w, h, fcn) {
    var data = Library.parseAssetData(aa)
    var tb = document.createElement("div")
    parent.appendChild(tb)
    tb.byme = nativeJr ? 1 : 0
    var md5 = data.md5
    tb.setAttribute("class", "assetbox off")
    tb.setAttribute("id", md5)
    tb.scale = !data.scale ? 0.5 : data.scale
    tb.fieldname = data.name
    tb.w = Number(data.width)
    tb.h = Number(data.height)
    if (!isFinite(tb.w) || tb.w <= 0 || !isFinite(tb.h) || tb.h <= 0) {
      tb.w = w
      tb.h = h
    }
    var scale = Math.min(w / tb.w, h / tb.h)
    var img = newHTML("img", undefined, tb)
    var offsetX = Math.max(0, Math.floor((tb.clientWidth - w) / 2))
    var offsetY = Math.max(0, Math.floor((tb.clientHeight - h) / 2))
    img.style.width = tb.w * scale + "px"
    img.style.height = tb.h * scale + "px"
    img.style.left = Math.floor((w - scale * tb.w) / 2 + offsetX) + "px"
    img.style.top = Math.floor((h - scale * tb.h) / 2 + offsetY) + "px"
    img.style.position = "absolute"
    img.style.display = "block"
    tb.style.position = "relative"
    if (data.altmd5) {
      IO.getAsset(data.altmd5, drawMe)
    }

    function drawMe(dataurl) {
      img.src = dataurl
    }
    onTouchStartBind(tb, function (evt) {
      fcn(evt, tb)
    })
    return tb
  }

  static addLocalThumbChoose(parent, data, w, h, fcn) {
    var tb = newHTML("div", "assetbox off", parent)
    var md5 = data.md5
    tb.byme = nativeJr ? 1 : 0
    tb.setAttribute("id", md5)
    tb.scale = !data.scale ? 0.5 : data.scale
    tb.fieldname = data.name
    tb.w = Number(data.width)
    tb.h = Number(data.height)
    tb.style.position = "relative"

    var img = newHTML("img", undefined, tb)
    var scale = Math.min(w / tb.w, h / tb.h)
    var offsetX = Math.max(0, Math.floor((tb.clientWidth - w) / 2))
    var offsetY = Math.max(0, Math.floor((tb.clientHeight - h) / 2))
    img.style.height = tb.h * scale + "px"
    img.style.width = tb.w * scale + "px"

    // img.style.left = Math.floor((w - scale * tb.w) / 2 + 9 * scaleMultiplier) + "px"
    // img.style.top = Math.floor((h - scale * tb.h) / 2 + 9 * scaleMultiplier) + "px"
    // img.style.position = "relative"
    img.style.position = "absolute"
    img.style.left = "50%"
    img.style.top = "50%"
    img.style.transform = "translate(-50%, -50%)"

    // Cached downsized-thumbnails are in pnglibrary
    //var pngPath = MediaLib.path.replace('svg', 'png');
    //img.src = pngPath + IO.getFilename(md5) + '.png';
    img.src = MediaLib.path + md5

    onTouchStartBind(tb, function (evt) {
      fcn(evt, tb)
    })
    return tb
  }

  static userAssetThumbnail(img, cnv, sizew, sizeh) {
    var scale = Math.min(sizew / img.width, sizeh / img.height)
    var currentCtx = cnv.getContext("2d")
    var iw = Math.floor(scale * img.width)
    var ih = Math.floor(scale * img.height)
    var ix = Math.floor((sizew - scale * img.width) / 2)
    var iy = Math.floor((sizeh - scale * img.height) / 2)
    currentCtx.drawImage(img, 0, 0, img.width, img.height, ix, iy, iw, ih)
  }

  static addEmptyThumb(parent, w, h) {
    var tb = document.createElement("div")
    tb.setAttribute("class", "assetbox off")
    tb.setAttribute("id", "none")
    tb.fieldname =
      type == "costumes"
        ? Localization.localize("LIBRARY_CHARACTER")
        : Localization.localize("LIBRARY_BACKGROUND")
    tb.byme = 1
    var cnv = newCanvas(tb, 9 * scaleMultiplier, 7 * scaleMultiplier, w, h, {
      position: "relative",
    })
    var ctx = cnv.getContext("2d")
    ctx.fillStyle = ScratchJr.stagecolor
    ctx.fillRect(0, 0, w, h)
    parent.appendChild(tb)
    onTouchStartBind(tb, function (evt) {
      Library.selectAsset(evt, tb)
    })
  }

  static addHR(div) {
    var hr = document.createElement("hr")
    div.appendChild(hr)
    hr.setAttribute("class", "bigdivide")
  }

  ///////////////////////////
  //selection

  static selectAsset(e, tb) {
    tb.pt = JSON.stringify(Events.getTargetPoint(e))
    if (shaking && e.target.className == "deleteasset") {
      Library.removeFromAssetList()
      return
    } else if (shaking) {
      Library.stopShaking()
    }
    if (tb.byme && tb.id != "none") {
      holdit(tb)
    }
    onTouchEndBind(tb, function (evt) {
      clickMe(evt, tb)
    })
    onTouchEndBind(window, function (evt) {
      clickMe(evt, tb)
    })
    onTouchMoveBind(window, function (evt) {
      clearEvents(evt, tb)
    })

    function holdit() {
      var repeat = function () {
        onTouchEndBind(tb, undefined)
        onTouchEndBind(window, undefined)
        onTouchMoveBind(window, undefined)
        timeoutEvent = undefined
        Library.stopShaking()
        shaking = tb
        Library.clearAllSelections()
        Library.startShaking(tb)
      }
      timeoutEvent = setTimeout(repeat, 500)
    }

    function clearEvents(e, tb) {
      var pt = Events.getTargetPoint(e)
      var pt2 = JSON.parse(tb.pt)
      if (Library.distance(pt, pt2) < 30) {
        return
      }
      e.preventDefault()
      if (timeoutEvent) {
        clearTimeout(timeoutEvent)
      }
      if (clickThumb) {
        Library.unSelect(clickThumb)
      }
      timeoutEvent = undefined
      onTouchEndBind(tb, undefined)
      onTouchEndBind(window, function () {
        onTouchMoveBind(window, undefined)
        onTouchEndBind(window, undefined)
      })
    }

    function clickMe(e, tb) {
      if (timeoutEvent) {
        clearTimeout(timeoutEvent)
      }
      Library.selectThisAsset(e, tb)
      timeoutEvent = undefined
      onTouchEndBind(tb, undefined)
      onTouchMoveBind(window, undefined)
      onTouchEndBind(window, undefined)
    }
  }

  static startShaking(b) {
    b.className = b.className + " shakeme"
    newHTML("div", "deleteasset", b)
    shaking = b
  }

  static stopShaking() {
    if (!shaking) {
      return
    }
    var b = shaking
    b.setAttribute("class", "assetbox off")
    var ic = b.childNodes[b.childElementCount - 1]
    if (ic.getAttribute("class") == "deleteasset") {
      b.removeChild(ic)
    }
    shaking = undefined
  }

  static removeFromAssetList() {
    if (!shaking) {
      return false
    }
    return Library.removeAssetThumb(shaking)
  }

  static removeAssetThumb(tb) {
    ScratchAudio.sndFX("cut.wav")
    var b = tb
    b.parentNode.removeChild(b)
    var key = type == "costumes" ? "usershapes" : "userbkgs"
    var json = {}
    json.cond = "md5 = ?"
    json.items = ["*"]
    json.values = [b.id]
    IO.query(key, json, Library.removeAssetFromLib)
    clickThumb = undefined
    selectedOne = undefined
    if (shaking == b) {
      shaking = undefined
    }
    if (libEx.userData && libEx.userData.length) {
      libEx.userData = libEx.userData.filter(function (item) {
        return Library.parseAssetData(item).md5 != b.id
      })
    }
    Library.refreshDeleteAllButton()
    return true
  }

  static confirmRemoveAsset(tb) {
    Library.openDeleteConfirm("このスプライトをさくじょしますか？", function () {
      Library.removeAssetThumb(tb)
    })
  }

  static openDeleteConfirm(message, onConfirm) {
    Library.closeDeleteConfirm()
    var overlay = newHTML("div", "library-delete-confirm", libFrame)
    overlay.setAttribute("id", "library-delete-confirm")
    var dialog = newHTML("div", "library-delete-confirm-card", overlay)
    var label = newHTML("p", "library-delete-confirm-text", dialog)
    label.textContent = message
    var actions = newHTML("div", "library-delete-confirm-actions", dialog)
    var cancel = newHTML("div", "library-delete-confirm-btn cancel", actions)
    cancel.textContent = "キャンセル"
    var confirm = newHTML("div", "library-delete-confirm-btn confirm", actions)
    confirm.textContent = "さくじょ"

    onTouchStartBind(overlay, function (evt) {
      evt.preventDefault()
      evt.stopPropagation()
    })
    onTouchEndBind(overlay, function (evt) {
      if (evt.target === overlay) {
        evt.preventDefault()
        evt.stopPropagation()
        Library.closeDeleteConfirm()
      }
    })
    onTouchEndBind(cancel, function (evt) {
      evt.preventDefault()
      evt.stopPropagation()
      Library.closeDeleteConfirm()
    })
    onTouchEndBind(confirm, function (evt) {
      evt.preventDefault()
      evt.stopPropagation()
      Library.closeDeleteConfirm()
      onConfirm()
    })
  }

  static confirmRemoveAllAssets() {
    if (!libEx.userData || libEx.userData.length < 1) {
      return
    }
    var message =
      type == "costumes"
        ? "きゃらくたーをすべてさくじょしますか？"
        : "はいけいをすべてさくじょしますか？"
    Library.openDeleteConfirm(message, Library.removeAllUserAssets)
  }

  static removeAllUserAssets() {
    if (!libEx.userData || libEx.userData.length < 1) {
      return false
    }
    var key = type == "costumes" ? "usershapes" : "userbkgs"
    for (var i = 0; i < libEx.userData.length; i++) {
      var data = Library.parseAssetData(libEx.userData[i])
      if (data.altmd5) {
        OS.remove(data.altmd5, OS.trace)
      }
    }
    var json = {}
    json.stmt = "delete from " + key + " where version = ?"
    json.values = [ScratchJr.version]
    OS.stmt(json, function () {
      libEx.userData = []
      selectedOne = undefined
      clickThumb = undefined
      Library.refreshDeleteAllButton()
      var div = gn("scrollarea")
      if (div) {
        div.innerHTML = ""
        Library.restoreDefaultResults(libEx.open(type))
      }
    })
    return true
  }

  static refreshDeleteAllButton() {
    var button = gn("library_delete_all")
    if (!button) {
      return
    }
    setProps(button.style, {
      display: libEx && libEx.userData && libEx.userData.length ? "inline-flex" : "none",
    })
    Library.layoutTopbar()
  }

  static closeDeleteConfirm() {
    var dialog = gn("library-delete-confirm")
    if (dialog && dialog.parentNode) {
      dialog.parentNode.removeChild(dialog)
    }
  }

  // Determine if an asset thumbnail is unique
  // md5: thumbnail md5 to determine uniqueness
  // type: "costumes" or "backgrounds"
  // callback: called with true if unique, false if duplicate exists
  static assetThumbnailUnique(md5, type, callback) {
    var key = type == "costumes" ? "usershapes" : "userbkgs"
    var json = {}
    json.cond = "ext = ? AND altmd5 = ?"
    json.items = ["md5", "altmd5"]
    json.values = ["svg", md5]
    json.order = "ctime desc"
    IO.query(key, json, function (results) {
      results = JSON.parse(results)
      callback(results.length <= 1)
    })
  }

  static removeAssetFromLib(str) {
    var key = type == "costumes" ? "usershapes" : "userbkgs"
    var aa = JSON.parse(str)[0]
    var data = Library.parseAssetData(aa)

    if (data.altmd5) {
      // Removes the thumbnail for the asset.
      // First ensure that there aren't other characters/bgs using the same thumb
      // (this is possible if we receive a duplicate project, for example)
      Library.assetThumbnailUnique(data.altmd5, type, function (isUnique) {
        if (isUnique) {
          OS.remove(data.altmd5, OS.trace)
        }
      })
    }

    IO.deleteobject(key, data.id, OS.trace)
  }

  static parseAssetData(data) {
    var res = new Object()
    for (var key in data) {
      res[key.toLowerCase()] = data[key]
    }
    return res
  }

  static selectThisAsset(e, tb) {
    if (tb.id == selectedOne) {
      if (type == "costumes") {
        Library.closeSpriteSelection(e)
      } else {
        Library.closeBkgSelection(e)
      }
    } else {
      Library.clearAllSelections()

      // Disable paint editor for PNG sprites
      var thumbID = tb.id
      var thumbType = thumbID.substr(thumbID.length - 3)
      if (thumbType == "png") {
        gn("library_paintme").style.opacity = 0
        onTouchStartBind(gn("library_paintme"), null)
      } else {
        gn("library_paintme").style.opacity = 1
        onTouchStartBind(gn("library_paintme"), Library.editResource)
      }

      tb.className = "assetbox on"
      selectedOne = tb.id
      clickThumb = tb
      if (tb.byme && tb.id != "none") {
        Library.showDeleteButton(tb)
      }
      if (tb.fieldname) {
        gn("assetname").textContent = tb.fieldname
        Library.layoutTopbar()
      }
    }
  }

  static clearAllSelections() {
    var div = gn("scrollarea")
    for (var i = 0; i < div.childElementCount; i++) {
      if (div.childNodes[i].nodeName == "DIV") {
        div.childNodes[i].className = "assetbox off"
        Library.hideDeleteButton(div.childNodes[i])
      }
    }
  }

  static unSelect(tb) {
    gn("assetname").textContent = ""
    Library.layoutTopbar()
    tb.className = "assetbox off"
    Library.hideDeleteButton(tb)
    selectedOne = undefined
    if (clickThumb) {
      if (tb.byme && clickThumb.childElementCount > 1) {
        clickThumb.childNodes[clickThumb.childElementCount - 1].style.visibility = "hidden"
      }
      clickThumb = undefined
    }
  }

  static showDeleteButton(tb) {
    var deleteButton = tb.getElementsByClassName("deleteasset")[0]
    if (!deleteButton) {
      deleteButton = newHTML("div", "deleteasset", tb)
      onTouchStartBind(deleteButton, function (evt) {
        evt.preventDefault()
        evt.stopPropagation()
      })
      onTouchEndBind(deleteButton, function (evt) {
        evt.preventDefault()
        evt.stopPropagation()
        Library.confirmRemoveAsset(tb)
      })
    }
    deleteButton.style.visibility = "visible"
  }

  static hideDeleteButton(tb) {
    var deleteButton = tb.getElementsByClassName("deleteasset")[0]
    if (!deleteButton) {
      return
    }
    deleteButton.style.visibility = "hidden"
  }

  static resizeScroll() {
    var w = Math.min(getDocumentWidth(), frame.offsetWidth)
    var h = Math.max(getDocumentHeight(), frame.offsetHeight)
    var dx = w - 20 * scaleMultiplier
    setProps(gn("scrollarea").style, {
      width: dx + "px",
      height: h - 120 * scaleMultiplier + "px",
    })
  }

  ///////////////////////////////////////////
  // Object actions
  //////////////////////////////////////////

  static editResource(e) {
    Library.close(e)
    if (type != "costumes") {
      Library.editBackground(e)
    } else {
      Library.editCostume(e)
    }
  }

  static editBackground() {
    var md5 = selectedOne && selectedOne != "none" ? selectedOne : undefined
    Paint.open(true, md5)
  }

  static editCostume() {
    var sname = undefined
    var cname = selectedOne ? clickThumb.fieldname : Localization.localize("LIBRARY_CHARACTER")
    var scale = selectedOne && selectedOne != "none" ? clickThumb.scale : 0.5
    var md5 = selectedOne && selectedOne != "none" ? selectedOne : undefined
    var w = selectedOne && selectedOne != "none" ? Math.round(clickThumb.w) : undefined
    var h = selectedOne && selectedOne != "none" ? Math.round(clickThumb.h) : undefined
    Paint.open(false, md5, sname, cname, scale, w, h)
  }

  static closeSpriteSelection(e) {
    e.preventDefault()
    e.stopPropagation()
    var id = selectedOne ? clickThumb.fieldname : Localization.localize("LIBRARY_CHARACTER")
    if (selectedOne && selectedOne != "none") {
      ScratchJr.stage.currentPage.addSprite(clickThumb.scale, selectedOne, id)
    }

    // Prevent reporting user asset names
    if (clickThumb) {
      var analyticsName = clickThumb.id
      if (!(selectedOne in MediaLib.keys)) {
        analyticsName = "user_asset"
      }
      OS.analyticsEvent("editor", "new_character", analyticsName)
    }
    Library.close(e)
  }

  static closeBkgSelection(e) {
    e.preventDefault()
    e.stopPropagation()
    if (selectedOne) {
      ScratchJr.stage.currentPage.setBackground(selectedOne, ScratchJr.stage.currentPage.updateBkg)
    }

    if (clickThumb) {
      var analyticsName = clickThumb.id
      if (!(selectedOne in MediaLib.keys)) {
        analyticsName = "user_background"
      }
      OS.analyticsEvent("editor", "choose_background", analyticsName)
    }
    Library.close(e)
  }

  /////////////////////////////////////////
  //Key Handeling Top Level prevention
  /////////////////////////////////////////

  static distance(pt1, pt2) {
    var dx = pt1.x - pt2.x
    var dy = pt1.y - pt2.y
    return Math.round(Math.sqrt(dx * dx + dy * dy))
  }
}
