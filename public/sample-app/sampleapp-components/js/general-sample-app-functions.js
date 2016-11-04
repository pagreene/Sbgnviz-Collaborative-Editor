//FUNDA WARNING
//Changed dynamicResize
////////////

//Override String endsWith method for IE
String.prototype.endsWith = function (suffix) {
  return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function dynamicResize()
{

  var win = $(this); //this = window

  var windowWidth = win.width() - 80; //80px padding on the left
  var windowHeight = win.height()  - 10; //10px padding at the bottom

  var canvasWidth = 1000;
  var canvasHeight = 680;

  //if (windowWidth > canvasWidth) {
  $("#sbgn-network-container").width(windowWidth * 0.7 );

  var inspectorCoef = 0.31;

  $("#inspector-tab-area").width(windowWidth * inspectorCoef);

  // $("#sbgn-inspector").width(windowWidth * 0.28);
  $(".nav-menu").width(windowWidth * 0.7);
  $(".navbar").width(windowWidth * 0.7);
  $("#sbgn-toolbar").width(windowWidth * 0.7);
  // $("#chat-area").width(windowWidth * 0.28);
  // $("#command-history-area").width(windowWidth * 0.28);

//    }

  //    if (windowHeight > canvasHeight) {
  if($("#sbgn-toolbar").width() < (444))
    $("#sbgn-network-container").css('top', '190px');
  else if($("#sbgn-toolbar").width() < (888))
    $("#sbgn-network-container").css('top', '140px');
  else
    $("#sbgn-network-container").css('top', '95px');


  $("#sbgn-network-container").height(windowHeight * 0.9);

  $("#inspector-tab-area").height(windowHeight);
  // $("#sbgn-inspector").height(windowHeight * 0.20);
  // $("#command-history-area").height(windowHeight * 0.21);
  // $("#chat-area").height(windowHeight * 0.53);
  //  }
}

$(window).on('resize', dynamicResize);

$(document).ready(function ()
{
  dynamicResize();
});

var getNodesData = function () {
  var nodesData = {};
  var nodes = cy.nodes();
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    nodesData[node.id()] = {
      width: node.width(),
      height: node.height(),
      x: node.position("x"),
      y: node.position("y")
    };
  }
  return nodesData;
};

var initilizeUnselectedDataOfElements = function () {
  var nodes = cy.nodes();
  var edges = cy.edges();

  cy.startBatch();

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    node.data("borderColor", node.css('border-color'));
    node.data("backgroundOpacity", node.css('background-opacity'));
  }

  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    edge.data("lineColor", edge.css('line-color'));
  }

  nodes.addClass('changeBorderColor');
  nodes.addClass('changeBackgroundOpacity');
  edges.addClass('changeLineColor');

  cy.endBatch();
};

/*
 * This function obtains the info label of the given node by
 * it's children info recursively
 */
var getInfoLabel = function (node) {
  /*    * Info label of a collapsed node cannot be changed if
   * the node is collapsed return the already existing info label of it
   */
  if (node._private.data.collapsedChildren != null) {
    return node._private.data.infoLabel;
  }

  /*
   * If the node is simple then it's infolabel is equal to it's sbgnlabel
   */
  if (node.children() == null || node.children().length == 0) {
    return node._private.data.sbgnlabel;
  }

  var children = node.children();
  var infoLabel = "";
  /*
   * Get the info label of the given node by it's children info recursively
   */
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    var childInfo = getInfoLabel(child);

    if (childInfo == null || childInfo == "") {
      continue;
    }

    if (infoLabel != "") {
      infoLabel += ":";
    }
    infoLabel += childInfo;
  }

  //return info label
  return infoLabel;
};

/*
 * This function create qtip for the given node
 */
var nodeQtipFunction = function (node) {
  /*    * Check the sbgnlabel of the node if it is not valid 
   * then check the infolabel if it is also not valid do not show qtip
   */
  var label = node._private.data.sbgnlabel;

  if (label == null || label == "")
    label = getInfoLabel(node);

  if (label == null || label == "")
    return;

  node.qtip({
    content: function () {
      var contentHtml = "<b style='text-align:center;font-size:16px;'>" + label + "</b>";
      var sbgnstatesandinfos = node._private.data.sbgnstatesandinfos;
      for (var i = 0; i < sbgnstatesandinfos.length; i++) {
        var sbgnstateandinfo = sbgnstatesandinfos[i];
        if (sbgnstateandinfo.clazz == "state variable") {
          var value = sbgnstateandinfo.state.value;
          var variable = sbgnstateandinfo.state.variable;
          var stateLabel = (variable == null /*|| typeof stateVariable === undefined */) ? value :
          value + "@" + variable;
          if (stateLabel == null) {
            stateLabel = "";
          }
          contentHtml += "<div style='text-align:center;font-size:14px;'>" + stateLabel + "</div>";
        }
        else if (sbgnstateandinfo.clazz == "unit of information") {
          var stateLabel = sbgnstateandinfo.label.text;
          if (stateLabel == null) {
            stateLabel = "";
          }
          contentHtml += "<div style='text-align:center;font-size:14px;'>" + stateLabel + "</div>";
        }
      }
      return contentHtml;
    },
    show: {
      ready: true
    },
    position: {
      my: 'top center',
      at: 'bottom center',
      adjust: {
        cyViewport: true
      }
    },
    style: {
      classes: 'qtip-bootstrap',
      tip: {
        width: 16,
        height: 8
      }
    }
  });

};

/*
 * This function refreshs the enabled-disabled status of undo-redo buttons.
 * The status of buttons are determined by whether the undo-redo stacks are empty.
 */
var refreshUndoRedoButtonsStatus = function () {
  var ur = cy.undoRedo();

  if (ur.isUndoStackEmpty()) {
    $("#undo-last-action").parent("li").addClass("disabled");
  }
  else {
    $("#undo-last-action").parent("li").removeClass("disabled");
  }

  if (ur.isRedoStackEmpty()) {
    $("#redo-last-action").parent("li").addClass("disabled");
  }
  else {
    $("#redo-last-action").parent("li").removeClass("disabled");
  }
};

var resetUndoRedoButtons = function() {
  $("#undo-last-action").parent("li").addClass("disabled");
  $("#redo-last-action").parent("li").addClass("disabled");
};

var calculatePaddings = function (paddingPercent) {
  //As default use the compound padding value
  if (!paddingPercent) {
    paddingPercent = parseInt(sbgnStyleRules['compound-padding'], 10);
  }

  var nodes = cy.nodes();
  var total = 0;
  var numOfSimples = 0;

  for (var i = 0; i < nodes.length; i++) {
    var theNode = nodes[i];
    if (theNode.children() == null || theNode.children().length == 0) {
      total += Number(theNode.width());
      total += Number(theNode.height());
      numOfSimples++;
    }
  }

  var calc_padding = (paddingPercent / 100) * Math.floor(total / (2 * numOfSimples));

  if (calc_padding < 5) {
    calc_padding = 5;
  }

  return calc_padding;
};

var calculateTilingPaddings = calculatePaddings;
var calculateCompoundPaddings = calculatePaddings;

var refreshPaddings = function () {
  var calc_padding = calculateCompoundPaddings();

  var nodes = cy.nodes();
  nodes.css('padding-left', 0);
  nodes.css('padding-right', 0);
  nodes.css('padding-top', 0);
  nodes.css('padding-bottom', 0);

  var compounds = nodes.filter('$node > node');

  compounds.css('padding-left', calc_padding);
  compounds.css('padding-right', calc_padding);
  compounds.css('padding-top', calc_padding);
  compounds.css('padding-bottom', calc_padding);
};

// This function is to be called after nodes are resized throuh the node resize extension or through undo/redo actions
var nodeResizeEndFunction = function (nodes) {
  nodes.removeClass('changeLabelTextSize');
  nodes.addClass('changeLabelTextSize');

  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var w = node.width();
    var h = node.height();

    node.removeStyle('width');
    node.removeStyle('height');

    node.data('sbgnbbox').w = w;
    node.data('sbgnbbox').h = h;
  }

  nodes.removeClass('noderesized');
  nodes.addClass('noderesized');
};

var showHiddenNeighbors = function (eles) {
  var hiddenNeighbours = sbgnFiltering.getProcessesOfGivenEles(eles).filter(':hidden');
  if (hiddenNeighbours.length === 0) {
    return;
  }

  var param = {
    eles: hiddenNeighbours
  };

  cy.undoRedo().do("showAndPerformIncrementalLayout", param);
};