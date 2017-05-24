class CameraRunItemView extends Backbone.Marionette.ItemView

  className : "CameraRunItemView"

  events:
    "click .camera-capture-btn"	: 'capture'
    "click .camera-browse-btn"  : 'browse'

  initialize: (options={}) ->
    console.log "hello init"
    Tangerine.progress.currentSubview = @
    @i18n()

    @model = options.model
    @parent = options.parent

    @config =
      allowCamera   : true
      allowGallery  : false
      allowEdit     : false
      image:
        quality       : @model.get("captureQuality") || 60
        targetHeight  : @model.get("captureSize")    || 300
        targetWidth   : @model.get("captureSize")    || 300
        mimeType      : 'image/png'

    @imgSource = ""
    @imgMimeType = "" 
    @imgBaseUrl = Tangerine.settings.attributes.groupHost+"/"+Tangerine.settings.groupDB+"/_design/"+Tangerine.settings.attributes.groupDDoc+"/_show/image/"
    console.log "Completed CameraRunItemView initialization", @
  i18n: ->
    @text =
      "title"           : t('CameraRunView.title') 

      "captureButton"   : t('CameraRunView.button.capture')
      "browseButton"    : t('CameraRunView.button.browse')

      "captureError"    : t('CameraRunView.error.capture')
      "noCameraError"   : t('CameraRunView.error.noCamera')

  capture: ->
    navigator.camera.getPicture(
      (data) =>
        @imgMimeType = "#{@config.image.mimeType}"
        @imgSource = data
        @$el.find(".imageContainer").show()
        @$el.find(".photoCapture").attr("src", "data:#{@config.image.mimeType};base64,"+ data)
        ""
      ,
      (error) =>
        @handleError()
        ""
      ,
        destinationType:  Camera.DestinationType.DATA_URL
        sourceType:       Camera.PictureSourceType.CAMERA
        allowEdit:        @config.allowEdit
        targetWidth:      @config.image.targetWidth
        targetHeight:     @config.image.targetHeight
    )
    ""

  browse: ->
    navigator.camera.getPicture(
      (data) =>
        @imgMimeType = "#{@config.image.mimeType}"
        @imgSource = data
        @$el.find(".photoContainer").show()
        @$el.find(".photoCapture").attr("src", "data:"+ @config.image.mimeType +";base64,"+ data)
      ,
      (error) =>
        @handleError()
      ,
        destinationType:  Camera.DestinationType.DATA_URL
        sourceType:       Camera.PictureSourceType.PHOTOLIBRARY
        allowEdit:        @config.allowEdit
        targetWidth:      @config.image.targetWidth
        targetHeight:     @config.image.targetHeight
    )
    ""

  handleError: ->
    @$el.find(".imageContainer, .noCameraError").hide()
    @$el.find(".captureError").hide()
    ""

  initDisplay: ->
    @$el.find(".camera-capture-btn, .camera-browse-btn, .imageContainer, .captureError, .noCameraError").hide()
    @updateDisplay()
    ""

  updateDisplay: ->
    @$el.find(".camera-capture-btn").show()   if @config.allowCamera
    @$el.find(".camera-browse-btn").show()    if @config.allowGallery

    @$el.find(".imageContainer").hide()       if @imgSource is null

    @$el.find(".noCameraError").show()        if not navigator.camera
    ""

  render: =>
    if navigator.camera is undefined
      @buttonState = "disabled"

    @$el.html "
      <section class='CameraRunView'>
        <div class='grid grid-pad'>
          <div class='col-3-12'>
            <div class='content'>
              <button class='camera-capture-btn capture command' #{@buttonState}>#{@text.captureButton}</button>
              <button class='camera-browse-btn browse command' #{@buttonState}>#{@text.browseButton}</button>
            </div>
          </div>
          <div class='col-7-12'>
            <div class='content'>
              <div class='imageContainer'>
                <img class='photoCapture'/>
              </div>
              <div class='captureError error'>#{@text.captureError}</div>
              <div class='noCameraError error'>#{@text.noCameraError}</div>
            </div>
          </div>
        </div>
      </section>
    "
    @initDisplay()

    @trigger "rendered"
    @trigger "ready"

  getResult: ->
    return { "imageBaseUrl": "#{@imgBaseUrl}", "imageBase64": "#{@imgSource}" , "mimeType": "#{@imgMimeType}"}

  getSkipped: ->
    return {}

  getSum: ->
    return {}

  onClose: ->
    ""

  isValid: -> #if no cam always return true, otherwise check if image is present
    return true if navigator.camera is undefined
    console.log "Check Valid: Image Source: ", @imgSource
    console.log "Check Valid: isValid", (@imgSource is "" && !@model.attributes.skippable)?false:true
    if @imgSource is "" && !@model.attributes.skippable then false else true


  testValid: ->
    if @isValid?
      return @isValid()
    else
      return false
    true

  showErrors: ->
    @$el.find("messages").html t('CameraRunView.error.invalid')
