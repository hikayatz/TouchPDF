/*
* @fileOverview TouchPDF - jQuery Plugin
* @version 0.4
*
* @author Loic Minghetti http://www.loicminghetti.net
* @see https://github.com/loicminghetti/TouchPDF-Jquery-Plugin
* @see http://plugins.jquery.com/project/touchPDF
*
* Copyright (c) 2014 Loic Minghetti
* Dual licensed under the MIT or GPL Version 2 licenses.
*
*/

/**
 * See (http://jquery.com/).
 * @name $
 * @class 
 * See the jQuery Library  (http://jquery.com/) for full details.  This just
 * documents the function and classes that are added to jQuery by this plug-in.
 */

/**
 * See (http://jquery.com/)
 * @name fn
 * @class 
 * See the jQuery Library  (http://jquery.com/) for full details.  This just
 * documents the function and classes that are added to jQuery by this plug-in.
 * @memberOf $
 */


(function ($) {
   "use strict";

   //Constants
   var EMPTY = "empty",
      INIT = "init",
      LOADING = "loading",
      LOADED = "loaded",
      ZOOMEDIN = "zoomedin",
      DRAGGING = "dragging",
      RENDERING = "rendering",

      PLUGIN_NS = 'TouchPDF',

      TOOLBAR_HEIGHT = 30,
      BORDER_WIDTH = 1,
      TAB_SPACING = -2,
      TAB_WIDTH = 41,
      TAB_OFFSET_WIDTH = 10;


   /**
   * The default configuration, and available options to configure touchPDF with.
   * You can set the default values by updating any of the properties prior to instantiation.
   * @name $.fn.pdf.defaults
   * @namespace
   * @property {string} [source=""] Path of PDF file to display
   * @property {string} [title="TouchPDF"] Title of the PDF to be displayed in the toolbar
   * @property {array} [tabs=[]] Array of tabs to display on the side. See doc for syntax.
   * @property {string} [tabsColor="beige" Default background color for all tabs. Available colors are "green", "yellow", "orange", "brown", "blue", "white", "black" and you can define your own colors with CSS.
   * @property {boolean} [disableZoom=false] Disable zooming of PDF document. By default, PDF can be zoomed using scroll, two fingers pinch, +/- keys, and toolbar buttons
   * @property {boolean} [disableSwipe=false] Disable swipe to next/prev page of PDF document. By default, PDF can be swiped using one finger
   * @property {boolean} [disableLinks=false] Disable all internal and external links on PDF document
   * @property {boolean} [disableKeys=false] Disable the arrow keys for next/previous page and +/- for zooming (if zooming is enabled)
   * @property {boolean} [redrawOnWindowResize=true] Force resize of PDF viewer on window resize
   * @property {float} [pdfScale=1] Defines the ratio between your PDF page size and the tabs size
   * @property {float} [quality=2] Set quality ratio for loaded PDF pages. Set at 2 for sharp display when user zooms up to 200%
   * @property {boolean} [showToolbar=true] Show a toolbar on top of the document with title, page number and buttons for next/prev pages and zooming
   * @property {function} [loaded=null] A handler triggered when PDF document is loaded (before display of first page)
   * @property {function} [changed=null] A handler triggered each time a new page is displayed
   * @property {string} [loadingHTML="Loading PDF"] Text or HTML displayed on white page shown before document is loaded 
   * @property {function} [loadingHeight=841] Height in px of white page shown before document is loaded 
   * @property {function} [loadingWidth=595] Width in px of white page shown before document is loaded 
   */
   var defaults = {
      source: null,
      title: "TouchPDF",
      tabs: [],
      tabsColor: "beige",
      disableZoom: false,
      disableSwipe: false,
      disableLinks: false,
      disableKeys: false,
      pdfScale: 1,
      quality: 2,
      redrawOnWindowResize: true,
      showToolbar: true,
      loaded: null,
      changed: null,
      loadingHeight: 841,
      loadingWidth: 595,
      loadingHTML: "Loading PDF",
      errorHTML: "Cannot load document",
      errorCallback: null,
      pdfViewMinHeight: 300,
      errorHtmlImg: null

   };



   /**
   * Load a PDF file in a div
   * The TouchPDF plugin can be instantiated via this method, or methods within 
   * @see TouchPDF
   * @class
   * @param {Mixed} method If the current DOMNode is a TouchPDF object, and <code>method</code> is a TouchPDF method, then
   * the <code>method</code> is executed, and any following arguments are passed to the TouchPDF method.
   * If <code>method</code> is an object, then the TouchPDF class is instantiated on the current DOMNode, passing the 
   * configuration properties defined in the object. See TouchPDF
   */
   $.fn.pdf = function (method) {
      var $this = $(this),
         plugin = $this.data(PLUGIN_NS);

      //Check if we are already instantiated and trying to execute a method	
      if (plugin && typeof method === 'string') {
         if (plugin[method]) {
            return plugin[method].apply(this, Array.prototype.slice.call(arguments, 1));
         } else {
            $.error('Method ' + method + ' does not exist on jQuery.pdf');
         }
      }
      //Else not instantiated and trying to pass init object (or nothing)
      else if (!plugin && (typeof method === 'object' || !method)) {
         return init.apply(this, arguments);
      }

      return $this;
   };

   //Expose our defaults so a user could override the plugin defaults
   $.fn.pdf.defaults = defaults;


   /**
   * Initialise the plugin for each DOM element matched
   * This creates a new instance of the main TouchPDF class for each DOM element, and then
   * saves a reference to that instance in the elements data property.
   * @internal
   */
   function init(options) {
      //Prep and extend the options
      if (!options) {
         options = {};
      }
      options = $.extend({}, $.fn.pdf.defaults, options);

      //For each element instantiate the plugin
      return this.each(function () {
         var $this = $(this);

         //Check we havent already initialised the plugin
         var plugin = $this.data(PLUGIN_NS);
         if (!plugin) {
            plugin = new TouchPDF(this, options);
            $this.data(PLUGIN_NS, plugin);
         }
      });
   }

   /**
   * Main TouchPDF Plugin Class.
   * Do not use this to construct your TouchPDF object, use the jQuery plugin method $.fn.pdf(); {@link $.fn.pdf}
   * @private
   * @name TouchPDF
   * @param {DOMNode} element The HTML DOM object to apply to plugin to
   * @param {Object} options The options to configure the plugin with.  @link {$.fn.pdf.defaults}
   * @see $.fn.pdf.defaults
   * @see $.fn.pdf
    * @class
   */
   function TouchPDF(element, options) {


      // Current phase of pdf loading
      var state = EMPTY;
      // Number of pages
      var totalPages = 0;
      // Page to be displayed
      var pageNum = 0;
      // Page currently rendering
      var pageNumRendering = 0;
      // jQuery wrapped element for this instance
      var $element = $(element);
      // PDF canvas
      var canvas = null;
      // jQuery wrapped PDF annotation layer
      var $annotations = null;
      // PDF.JS object
      var pdfDoc = null;

      var scale = 1;

      var ctx = false;

      var pagesRefMap = [];

      var plugin = this;

      var tabWidth = 0;
      var $drag = null, $viewer = null;

      var linksDisabled = false;

      initDom();
      load();


      //
      //Public methods
      //

      /**
      * Go to specific page of PDF file
      * @function
      * @name $.fn.pdf#goto
      * @return {DOMNode} The Dom element that was registered with TouchPDF 
      * @example $("#element").pdf("goto", 10);
      */
      this.goto = function (number) {
         goto(number);
         return $element;
      };

      /**
      * Go to previous page of PDF file, until first page
      * @function
      * @name $.fn.pdf#previous
      * @return {DOMNode} The Dom element that was registered with TouchPDF 
      * @example $("#element").pdf("previous");
      */
      this.previous = function () {
         goto(pageNum - 1);
         return $element;
      };

      /**
      * Go to next page of PDF file, until end of pdf
      * @function
      * @name $.fn.pdf#next
      * @return {DOMNode} The Dom element that was registered with TouchPDF 
      * @example $("#element").pdf("next");
      */
      this.next = function () {
         goto(pageNum + 1);
         return $element;
      };

      /**
      * Force redraw of pdf (height, width and zoom)
      * @function
      * @name $.fn.pdf#redraw
      * @return {DOMNode} The Dom element that was registered with TouchPDF 
      * @example $("#element").pdf("redraw");
      */
      this.redraw = function () {
         redraw();
         return $element;
      };

      /**
      * Destroy the pdf container completely.
      * @function
      * @name $.fn.pdf#destroy
      * @example $("#element").pdf("destroy");
      */
      this.destroy = function () {
         $element.empty().removeClass("touchPDF");

      };

      /**
      * Get the current page number (may not be rendered yet)
      * @function
      * @name $.fn.pdf#getPageNumber
      * @return {int} Current page number, 0 if PDF is not loaded
      * @example $("#element").pdf("getPageNumber");
      */
      this.getPageNumber = function () {
         return pageNum;
      };

      /**
      * Get the total number of pages of loaded PDF
      * @function
      * @name $.fn.pdf#getTotalPages
      * @return {int} The number of pages, 0 if PDF is not loaded
      * @example $("#element").pdf("getTotalPages");
      */
      this.getTotalPages = function () {
         return totalPages;
      };




      //
      // Private methods
      //


      function goto(number) {
         if (state == EMPTY || state == INIT) return;
         if (number < 1) number = 1;
         if (number > totalPages) number = totalPages;
         if (number == 0) return;
         pageNum = number;
         renderPage();

         // update tabs
         var z = 1;
         $element.find(".pdf-tabs .tab").each(function (i, a) {
            var $a = $(a);
            var aPageNum = $a.data("page");
            if (aPageNum < number) {
               $a.removeClass("right");
               $a.css("z-index", 1000 + z++);
            } else if (aPageNum == number) {
               $a.removeClass("right");
               $a.css("z-index", 1000 + z++);
            } else {
               $a.addClass("right");
               $a.css("z-index", 1000 - z++);
            }
         });
      }

      function initDom() {
         if (state != EMPTY) return;
         $element.addClass("touchPDF").html(
            '<div class="pdf-outerdiv">'
            + '<div class="pdf-tabs"></div>'
            + '<div class="pdf-toolbar"></div>'
            + '<div class="pdf-viewer">'
            + '<div class="pdf-loading">' + options.loadingHTML + '</div>'
            + '<div class="pdf-drag">'
            + '<div class="pdf-canvas">'
            + '<canvas></canvas>'
            + '<div class="pdf-annotations"></div>'
            + '</div>'
            + '</div>'
            + '</div>'
            + '</div>');

         if (options.showToolbar) {

            $element.find(".pdf-toolbar").html(
               '<div class="pdf-title">' + options.title + '</div>'
               + '<div class="pdf-button"><button class="pdf-prev">&lt;</button></div>'
               + '<div class="pdf-button"><span class="pdf-page-count"></span></div>'
               + '<div class="pdf-button"><button class="pdf-next">&gt;</button></div>'
               + (options.disableZoom ? '' : '<div class="pdf-button"><button class="pdf-zoomin">+</button></div>'
                  + '<div class="pdf-button"><button class="pdf-zoomout">-</button></div>')
            );

            $element.find(".pdf-toolbar > .pdf-title").on("click", function () {
               goto(1);
            });
            $element.find(".pdf-toolbar > .pdf-button > .pdf-prev").on("click", function () {
               goto(pageNum - 1);
            });
            $element.find(".pdf-toolbar > .pdf-button > .pdf-next").on("click", function () {
               goto(pageNum + 1);
            });
         }

         $drag = $element.find(".pdf-drag");
         $viewer = $element.find(".pdf-viewer");


         if (!options.disableKeys) {
            $(window).keydown(function (event) {
               if (event.keyCode == 37) goto(pageNum - 1);
               else if (event.keyCode == 39) goto(pageNum + 1);
            });
         }

         if (options.redrawOnWindowResize) {
            var windowResizeTimeout = false;
            $(window).resize(function () {
               clearTimeout(windowResizeTimeout);
               windowResizeTimeout = setTimeout(function () {
                  redraw();
               }, 100);
            });
         }

         if (!options.disableZoom) {

            $drag.panzoom({
               contain: 'invert',
               minScale: 1,
               disablePan: true,
               increment: 0.25,
               maxScale: 2,
               onChange: function () {
                  linksDisabled = true;
                  $drag.panzoom("option", "disablePan", false);
                  state = ZOOMEDIN;
               },
               onEnd: function () {
                  setTimeout(function () {
                     linksDisabled = false;
                     if ($drag.panzoom("getMatrix")[0] == 1) zoomReset();
                  }, 1);
               }

            });
            $drag.panzoom('enable');

            $drag.parent().on('mousewheel.focal', function (e) {
               e.preventDefault();
               var delta = e.delta || e.originalEvent.wheelDelta;
               var direction = delta ? delta < 0 : e.originalEvent.deltaY > 0;
               if (direction) zoomOut(e);
               else zoomIn(e);
            });

            if (options.showToolbar) {
               $element.find(".pdf-toolbar > .pdf-button > .pdf-zoomin").on("click", function () {
                  zoomIn();
               });
               $element.find(".pdf-toolbar > .pdf-button > .pdf-zoomout").on("click", function () {
                  zoomOut();
               });
            }

            if (!options.disableLinks) {
               // enable links while zoomed in
               var touchlink = null;
               $drag.on('touchstart', "a", function (e) {
                  touchlink = this;
                  setTimeout(function () {
                     touchlink = null;
                  }, 100);
               });
               $drag.on('touchend', "a", function (e) {
                  if (this == touchlink) {
                     e.stopImmediatePropagation();
                     this.click();
                  }
               });
            }
         }


         if (!options.disableSwipe) {
            $viewer.swipe({
               swipe: function (event, direction, distance, duration, fingerCount, fingerData) {
                  if (state != LOADED) return;
                  linksDisabled = true;
                  setTimeout(function () { linksDisabled = false; }, 1);
                  if (direction == "right") goto(pageNum - 1);
                  else if (direction == "left") goto(pageNum + 1);
               },
               threshold: 50,
               excludedElements: ".noSwipe"
            });
         }

         canvas = $element.find("canvas")[0];
         ctx = canvas.getContext('2d');

         $annotations = $element.find(".pdf-annotations");

         state = INIT;

         redraw();
      }

      function zoomIn(focal) {
         if (options.disableZoom) return;
         if (state != ZOOMEDIN && state != LOADED) return;
         state = ZOOMEDIN;
         $drag.panzoom('zoom', false, {
            increment: 0.25,
            animate: true,
            focal: focal
         });
         linksDisabled = false;
      }

      function zoomOut(focal) {
         if (options.disableZoom) return;
         if (state != ZOOMEDIN) return;
         $drag.panzoom('zoom', true, {
            increment: 0.25,
            animate: true,
            focal: focal
         });
         linksDisabled = false;

         if ($drag.panzoom("getMatrix")[0] == 1) zoomReset();
      }
      function zoomReset() {
         if (options.disableZoom) return;
         $drag.panzoom('reset');
         linksDisabled = false;
         $drag.panzoom("option", "disablePan", true);
         state = LOADED;
      }

      /**
       * Asynchronously downloads PDF.
       */
      function load() {
         if (state != INIT) return;
         state = LOADING;

         PDFJS.getDocument(options.source).then(function (pdfDoc_) {
            pdfDoc = pdfDoc_;
            totalPages = pdfDoc.numPages;
            if (totalPages < 1) return;

            state = LOADED;
            if (options.loaded) options.loaded()
            goto(1);
         }).catch(function (error) {
            var elPdfLoading = $element.find(".pdf-loading")
            elPdfLoading.html(options.errorHTML)
            elPdfLoading.css("font-size", "23px")
            if (options.errorHtmlImg == null) {
               elPdfLoading.prepend('<img class="pdf-error img-responsive" src="data:image/svg+xml;base64,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AnXUK3skU9943nbuvs+yngce9nEUhz0p8HuxpKm+qMWSygjSYlgCSBxVxw2Nj+dNcM/T//PDD/7y8N3akIqioqIogHMWH0x8VTp27bW8+34D10Rh/f6Bh3YOxjhiwCMkkQCBQewEWcS1UW3NH0q87K+f/J+b573w+19qIyqKioqibCKJI7w3fqzt3nv/5W269akwBgPBptQZA+JUVNg3af33JJwtheiu5+77r8ljH1VBURQVFUXZnMViLSb99Zn4lOFXRuT7g4yf6eHIJ+sIhgEmghGbuDgZ+/64P48Z84vva4iwoqioKMrnk83ma3r2P6x3kMkcBvZ96wCfATgL4+J1cSF8ZOOKRW9PevmP6phXlC+AHn5U9gpefXx07ckjvj3D2bhaPMmn6VkAtjHIxmtrVi2b+dzon1ttKUVRUVGUf2yp5EvAkOVJbNebjHQmIjAAw+QKjdGysLb6o6VzPtCGUhQVFUX5ZxCQs6vjKFztkRzEEDgHeCRREoeLmKRO20hRVFQU5Z+CySCfyayzUbTYJJEjL8ewQGLjRhfVzcnlsvXaSoryxVFHvbJXkMQh4FxhwNHH90psYbAHKWEbwzbWzvbi8NFHbv/u/FVLFmpDKYpaKoryj4nCAmZPfcteIN95rjQXdBFEJzgnNmEaUxMW3p05aYI2kqJsBzT3l7JXcdKw4Thx6IWlYWNjR4hz7PmrHvnvUY1L583SxlEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVEURVFaA/8PBCAkr1qn4roAAAAASUVORK5CYII=" />')
            } else {
               var imgHtml = $('<img class="pdf-error img-responsive">');
               imgHtml.attr('src', options.errorHtmlImg);
               elPdfLoading.prepend(imgHtml)
            }
            if ($.isFunction(options.errorCallback)) {
               options.errorCallback(error);
            }
         });

         if (options.tabs && $.isArray(options.tabs)) {

            var top = [];
            var maxOffset = 0;

            $.each(options.tabs, function (i, tab) {
               if (tab.offset && tab.offset > maxOffset) maxOffset = tab.offset;
            });

            tabWidth = TAB_WIDTH + TAB_OFFSET_WIDTH * maxOffset;

            $.each(options.tabs, function (i, tab) {
               var offset = tab.offset || 0;
               if (top[offset] === undefined) {
                  top[offset] = 5 + TOOLBAR_HEIGHT;
               }

               var $a = $("<a>")
                  .addClass("tab")
                  .data("page", tab.page)
                  .css("margin-left", offset * TAB_OFFSET_WIDTH + "px")
                  .css("margin-right", (maxOffset - offset) * TAB_OFFSET_WIDTH + "px")
                  .click(function () {
                     if (tab.page == pageNumRendering) goto(tab.page - 1);
                     else goto(tab.page)
                  });
               var $span = $("<span>")
                  .html(tab.title)
                  .appendTo($a);

               if (tab.bottom !== undefined) {
                  $a.css("bottom", tab.bottom);
               } else {
                  if (tab.top !== undefined) top[offset] = tab.top + TOOLBAR_HEIGHT;
                  $a.css("top", top[offset]);
               }

               if (tab.title.length > 2) $a.addClass("large");
               if (!tab.color) tab.color = options.tabsColor;
               $a.addClass(tab.color);
               if (tab.height) {
                  $a.css("height", tab.height);
                  $span.css("width", tab.height);
               }

               $element.find(".pdf-tabs").append($a);

               if (tab.bottom === undefined) top[offset] += $a.height() + TAB_SPACING;
            });
         }
      }

      /**
      * Get page info from document, resize canvas accordingly, and render page.
      * @param num Page number.
      */
      function renderPage() {
         if (state != LOADED && state != ZOOMEDIN) return;
         if (pageNum == pageNumRendering) return;

         zoomReset();
         state = RENDERING;
         pageNumRendering = pageNum;
         updatePageCount();

         // Using promise to fetch the page
         pdfDoc.getPage(pageNumRendering).then(function (page) {
            var viewport = page.getViewport(options.pdfScale * options.quality);
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            $(".pdf-canvas").css("transform", "scale(" + (1 / options.quality) + ")").css("transform-origin", "top left");

            // Render PDF page into canvas context
            var renderTask = page.render({
               canvasContext: ctx,
               viewport: viewport
            });

            if (!options.disableLinks) {
               renderAnnotations(page, viewport);
            }

            // Wait for rendering to finish
            renderTask.promise.then(function () {
               state = LOADED;
               if (pageNumRendering != pageNum) {
                  // New page rendering is pending
                  renderPage();
               }
            });

            redraw();
            $element.find(".pdf-loading").hide();
            $element.find(".pdf-tabs").css("visibility", "visible");
            $element.find("canvas").css("visibility", "visible");

            if (options.changed) options.changed();

         });
      }


      function redraw() {

         if (state == INIT) {
            var pdfHeight = options.loadingHeight;
            var pdfWidth = options.loadingWidth;

         } else {
            var pdfHeight = canvas.height / options.quality;
            var pdfWidth = canvas.width / options.quality;
         }
         var winHeight = $element.height();
         var winWidth = $element.width();


         scale = Math.min(winHeight / (pdfHeight + TOOLBAR_HEIGHT + BORDER_WIDTH * 2), winWidth / (pdfWidth + tabWidth * 2 + BORDER_WIDTH * 2));
         if (scale > 1) scale = 1;
         // modified this line because if error pdfview not show anything
         if (scale == 0) scale = 1;
         if (pdfHeight < options.pdfViewMinHeight) {
            pdfHeight = options.pdfViewMinHeight;
         }

         $element.find(".pdf-outerdiv")
            .css("transform", "scale(" + scale + ")")
            .css("width", pdfWidth + BORDER_WIDTH * 2)
            .css("height", pdfHeight + TOOLBAR_HEIGHT + BORDER_WIDTH * 2)
            .css("padding", "0 " + tabWidth + "px")
            .css("left", (winWidth - scale * (pdfWidth + tabWidth * 2 + BORDER_WIDTH * 2)) / 2);

         $element.find(".pdf-toolbar")
            .css("width", pdfWidth)
            .css("height", TOOLBAR_HEIGHT)
            .css("left", tabWidth + BORDER_WIDTH);

         $viewer
            .css("width", pdfWidth)
            .css("height", pdfHeight)
            .css("left", tabWidth)
            .css("top", TOOLBAR_HEIGHT)
            .css("border-width", BORDER_WIDTH);

         $drag
            .css("width", pdfWidth)
            .css("height", pdfHeight);

         if (!options.disableZoom) {
            $drag.panzoom('resetDimensions');
         }

         if (!options.disableSwipe) {
            $viewer.swipe("option", "threshold", 75 * scale);
         }


      }



      function updatePageCount() {
         if (state == EMPTY || state == INIT) return;
         $element.find(".pdf-page-count").html(pageNum + " / " + totalPages);
      }

      function getPageIndex(destRef) {
         var defer = $.Deferred();

         if (pagesRefMap[destRef.num + ' ' + destRef.gen + ' R']) {
            defer.resolve(pagesRefMap[destRef.num + ' ' + destRef.gen + ' R']);

         } else {
            pdfDoc.getPageIndex(destRef).then(function (pageIndex) {
               pagesRefMap[destRef.num + ' ' + destRef.gen + ' R'] = pageIndex + 1;
               defer.resolve(pageIndex + 1);
            });
         }
         return defer.promise();
      }

      function renderAnnotations(page, viewport) {
         if (state != RENDERING) return;

         $annotations.empty();

         page.getAnnotations().then(function (annotationsData) {

            viewport = viewport.clone({ dontFlip: true });

            $.each(annotationsData, function (i, data) {
               if (!data || !data.hasHtml || data.subtype !== 'Link' || (!data.dest && !data.url)) return;

               var $el = $(PDFJS.AnnotationUtils.getHtmlElement(data, page.commonObjs));
               var rect = data.rect;
               var view = page.view;
               rect = PDFJS.Util.normalizeRect([
                  rect[0],
                  view[3] - rect[1] + view[1],
                  rect[2],
                  view[3] - rect[3] + view[1]
               ]);
               $el.css("left", rect[0] + 'px')
                  .css("top", rect[1] + 'px')
                  .css("position", 'absolute');

               var transform = viewport.transform;
               var transformStr = 'matrix(' + transform.join(',') + ')';
               $el.css('transform', transformStr);
               var transformOriginStr = -rect[0] + 'px ' + -rect[1] + 'px';
               $el.css('transformOrigin', transformOriginStr);

               var link = $el.find("a")
                  .on('mousedown', function (e) {
                     e.preventDefault();
                  });

               if (data.url) {

                  link.addClass("externalLink")
                     .attr("href", data.url)
                     .attr("target", "_blank");

               } else if (data.dest) {

                  link.addClass("internalLink")
                     .data("dest", data.dest)
                     .on('click', function (e) {
                        if (state != LOADED && state != ZOOMEDIN) return false;
                        if (linksDisabled) return false;
                        var dest = $(this).data("dest");

                        if (dest instanceof Array) {
                           getPageIndex(dest[0]).then(function (num) {
                              if (state != LOADED && state != ZOOMEDIN) return;
                              goto(num);
                           });
                        } else {
                           pdfDoc.getDestination($(this).data("dest")).then(function (destRefs) {
                              if (!(destRefs instanceof Array)) return; // invalid destination
                              getPageIndex(destRefs[0]).then(function (num) {
                                 if (state != LOADED && state != ZOOMEDIN) return;
                                 if (linksDisabled) return;
                                 goto(num);
                              });
                           });
                        }
                        return false;
                     });
               }

               $annotations.append($el);
            });

         });

      }


   }


})(jQuery);

