/**
 * Created by durupina on 11/14/16.
 * Human listens to agent socket and performs menu operations requested by the agent
*/
let jsonMerger = require('./merger/json-merger.js');

module.exports =  function(app) {

    return {

        listen: function () {
            let self = this;


            app.socket.on('loadFile', function (txtFile, callback) {
                try {

                    appUtilities.getActiveSbgnvizInstance().loadSBGNMLText(txtFile);
                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }

            });

            app.socket.on('newFile', function (data, callback) {
                let cyId = appUtilities.getActiveNetworkId();
                self.newFile(data, cyId,  callback);
            });

            app.socket.on('runLayout', function (data, callback) {
                try {
                    $("#perform-layout").trigger('click');
                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('addNode', function (param, callback) {
                try {
                    //does not trigger cy events
                    let newNode = appUtilities.getActiveChiseInstance().elementUtilities.addNode(param.position.x, param.position.y, param.data.class);
                    let cyId = appUtilities.getActiveNetworkId();

                    //notifies other clients

                    app.modelManager.addModelNode(newNode.id(), cyId, param, "me");
                    app.modelManager.initModelNode(newNode, cyId, "me");

                    if (callback) callback(newNode.id());
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('deleteEles', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getActiveCy().elements().unselect();


                    //first delete edges
                    data.elementIds.forEach(function (id) {
                        appUtilities.getActiveCy().getElementById(id).select();
                    });


                    if (data.type === "simple")
                        appUtilities.getActiveChiseInstance().deleteElesSimple(appUtilities.getActiveCy().elements(':selected'));
                    else
                        appUtilities.getActiveChiseInstance().deleteNodesSmart(appUtilities.getActiveCy().nodes(':selected'));

                    if(callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });

            app.socket.on('addImage', function (data, callback) {
                try {

                    let status = app.modelManager.addImage(data);
                    let images = app.modelManager.getImages();
                    app.dynamicResize(images);

                    if (callback) callback(status);

                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('addEdge', function (data, callback) {
                try {
                    //does not trigger cy events
                    let newEdge = appUtilities.getActiveChiseInstance().elementUtilities.addEdge(source, target, sbgnclass, id, visibility);
                    let cyId = appUtilities.getActiveNetworkId();

                    //notifies other clients
                    app.modelManager.addModelEdge(newNode.id(), cyId, data, "me");
                    // app.modelManager.initModelEdge(newEdge, cyId, "me");

                    if (callback) callback(newEdge.id());
                }
                catch (e) {
                    console.log(e);
                    if(callback) callback();

                }
            });


            app.socket.on('align', function (data, callback) {
                try {
                    let nodes = appUtilities.getActiveCy().collection();
                    if (data.nodeIds === '*' || data.nodeIds === 'all')
                        nodes = appUtilities.getActiveCy().nodes();
                    else
                        data.nodeIds.forEach(function (nodeId) {
                            nodes.add(appUtilities.getActiveCy().getElementById(nodeId));
                        });

                    appUtilities.getActiveChiseInstance().align(nodes, data.horizontal, data.vertical, appUtilities.getActiveCy().getElementById(data.alignTo));

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }

            });
            app.socket.on('updateVisibility', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getActiveCy().elements().unselect();

                    if (data.val === "showAll")
                        $("#show-all").trigger('click');
                    else {
                        data.elementIds.forEach(function (id) {
                            appUtilities.getActiveCy().getElementById(id).select();
                        });

                        if (data.val == "show")
                            $("#show-selected").trigger('click');
                        else
                            $("#hide-selected").trigger('click');
                    }


                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });

            app.socket.on('searchByLabel', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getActiveCy().elements().unselect();

                    appUtilities.getActiveChiseInstance().searchByLabel(data.label);

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });
            app.socket.on('updateHighlight', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getActiveCy().elements().unselect();

                    if (data.val === "remove") {
                        $("#remove-highlights").trigger('click');
                    }
                    else {
                        data.elementIds.forEach(function (id) {
                            appUtilities.getActiveCy().getElementById(id).select();
                        });

                        if (data.val === "neighbors")
                            $("#highlight-neighbors-of-selected").trigger('click');
                        else if (data.val === "processes")
                            $("#highlight-processes-of-selected").trigger('click');
                    }

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });

            app.socket.on('updateExpandCollapse', function (data, callback) {
                try {

                    //unselect all others
                    appUtilities.getActiveCy().elements().unselect();

                    data.elementIds.forEach(function (id) {
                        appUtilities.getActiveCy().getElementById(id).select();
                    });

                    if (data.val === "collapse")
                        $("#collapse-selected").trigger('click');
                    else
                        $("#expand-selected").trigger('click');

                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });


            app.socket.on('addCompound', function (data, callback) {
                try {
                    //unselect all others
                    appUtilities.getActiveCy().elements().unselect();

                    data.elementIds.forEach(function (elId) {
                        let el = appUtilities.getActiveCy().getElementById(elId);
                        if(el.isNode())
                            el.select();
                    });

                      appUtilities.getActiveChiseInstance().createCompoundForGivenNodes(appUtilities.getActiveCy().nodes(':selected'), data.val);



                    // if (data.val === "complex")
                    //     $("#add-complex-for-selected").trigger('click');
                    // else
                    //     $("#add-compartment-for-selected").trigger('click');


                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }

            });

            app.socket.on('clone', function (data, callback) {
                try {
                    appUtilities.getActiveCy().elements().unselect();

                    data.elementIds.forEach(function (nodeId) {
                        appUtilities.getActiveCy().getElementById(nodeId).select();
                    });

                    $("#clone-selected").trigger('click');


                    if (callback) callback("success");
                }
                catch (e) {
                    console.log(e);
                    if (callback) callback();

                }
            });

            //Open in another window
            app.socket.on('openPCQueryWindow', function(data, callback){
                let loc = window.location.href;
                if (loc[loc.length - 1] === "#") {
                    loc = loc.slice(0, -1);
                }
                let w = window.open((loc + "_query"), function () {

                });

                // //because window opening takes a while
                setTimeout(function () {

                    let json = appUtilities.getActiveChiseInstance().convertSbgnmlTextToJson(data.graph);
                    w.postMessage(JSON.stringify(json), "*");
                }, 2000);

            });

            app.socket.on("displaySbgn", function(sbgn, callback){

                let jsonObj = appUtilities.getActiveChiseInstance().convertSbgnmlTextToJson(sbgn);

                //get another sbgncontainer and display the new SBGN model.
                app.modelManager.newModel("me", true);

                appUtilities.getActiveChiseInstance().updateGraph(jsonObj, function(){
                    app.modelManager.initModel(appUtilities.getActiveCy().nodes(), appUtilities.getActiveCy().edges(), appUtilities, "me");

                    $("#perform-layout").trigger('click');

                    if (callback) callback("success");
                });

            });

            app.socket.on("mergeSbgn", function (data, callback) {

                let newJson = appUtilities.getActiveChiseInstance().convertSbgnmlTextToJson(data.graph);
                if(!data.cyId)
                    data.cyId = appUtilities.getActiveNetworkId();
                self.mergeJsonWithCurrent(newJson, data.cyId,  callback);

            });

            app.socket.on("mergeJsonWithCurrent", function (data, callback) {

                if(!data.cyId)
                    data.cyId = appUtilities.getActiveNetworkId();
                self.mergeJsonWithCurrent(data.graph, data.cyId, callback);
            });
        },


        //Merge an array of json objects with the json of the current sbgn network
        //on display to output a single json object.
        mergeJsonWithCurrent: function (jsonGraph, cyId, callback) {
            let currJson = appUtilities.getActiveChiseInstance().createJson();
            app.modelManager.setRollbackPoint(cyId); //before merging.. for undo

            let jsonObj = jsonMerger.mergeJsonWithCurrent(jsonGraph, currJson);

            //get another sbgncontainer and display the new SBGN model.
            app.modelManager.newModel(cyId, "me", true);

            //this takes a while so wait before initiating the model
            appUtilities.getActiveChiseInstance().updateGraph(jsonObj, function () {

                app.modelManager.initModel(appUtilities.getActiveCy().nodes(), appUtilities.getActiveCy().edges(), cyId, appUtilities, "me");

                //select the new graph
                jsonGraph.nodes.forEach(function (node) {
                    appUtilities.getActiveCy().getElementById(node.data.id).select();
                });

                $("#perform-layout").trigger('click');

                appUtilities.getActiveCy().elements().unselect();

                // Call merge notification after the layout
                setTimeout(function () {
                    app.modelManager.mergeJsons(cyId, "me", true);
                    if (callback) callback("success");
                }, 1000);

            });
        },

        newFile: function(data, cyId,  callback){
            try {
                appUtilities.getActiveCy().remove(appUtilities.getActiveCy().elements());
                app.modelManager.newModel(cyId, "me"); //do not delete cytoscape, only the model
                //close all the other tabs
                app.model.set('_page.doc.images', null);

                app.dynamicResize(); //to clean the canvas

                app.model.set('_page.doc.provenance', null);

                if (callback) callback("success");
            }
            catch (e) {
                console.log(e);
                if(callback) callback();

            }
        }
    }
}

