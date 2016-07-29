/*
 *	Model initialization
 *  Event handlers of model updates
 *	Author: Funda Durupinar Babur<f.durupinar@gmail.com>
 */
var app = module.exports = require('derby').createApp('cwc', __filename);


app.loadViews(__dirname + '/views');
//app.loadStyles(__dirname + '/styles');
//app.serverUse(module, 'derby-stylus');


var ONE_DAY = 1000 * 60 * 60 * 24;

var ONE_HOUR = 1000 * 60 * 60;

var ONE_MINUTE = 1000 * 60;

var docReady = false;

var useQunit = true;

var menu;

var userCount;
var socket;

var modelManager;
var oneColor = require('onecolor');
var CircularJSON = require('circular-json');
app.on('model', function (model) {


    model.fn('pluckUserIds', function (items, additional) {
        var ids, item, key;


        if (items == null) {
            items = {};
        }
        ids = {};
        if (additional) {
            ids[additional] = true;

        }
        for (key in items) {
            item = items[key];
            //do not include previous messages

            if (item != null ? item.userId : void 0) {
                ids[item.userId] = true;
            }
        }


        return Object.keys(ids);
    });

    model.fn('biggerTime', function (item) {
        var duration = model.get('_page.durationId');
        var startTime;
        if (duration < 0)
            startTime = 0;
        else
            startTime = new Date - duration;

        return item.date > startTime;
    });


});

app.get('/', function (page, model, params) {
    function getId() {
        return model.id();
    }

    function idIsReserved() {
        var ret = model.get('documents.' + docId) != undefined;
        return ret;
    }

    var docId = getId();

    while (idIsReserved()) {
        docId = getId();
    }

    // if( useQunit ){ // use qunit testing doc if we're testing so we don't disrupt real docs
    //     docId = 'qunit';
    // }

    return page.redirect('/' + docId);
});


app.get('/:docId', function (page, model, arg, next) {
    var messagesQuery, room;
    room = arg.docId;





    var docPath = 'documents.' + arg.docId;



    model.subscribe(docPath, 'cy', function(err) {
            if (err) {
                return next(err);
            }
            model.setNull(docPath, { // create the empty new doc if it doesn't already exist
                id: arg.docId
            });


            // create a reference to the document
            model.ref('_page.doc', 'documents.' + arg.docId);
            model.subscribe(docPath, 'history');
            model.subscribe(docPath, 'undoIndex');
            model.subscribe(docPath, 'context');


        }

    );
    model.subscribe(docPath, 'images');



    //chat related
    model.set('_page.room', room);

    model.set('_page.durations', [{name: 'All', id: -1}, {name: 'One day', id: ONE_DAY}, {
        name: 'One hour',
        id: ONE_HOUR
    }, {name: 'One minute', id: ONE_MINUTE}]);


    model.set('_sbgnviz.samples',
        [{name: 'Activated STAT1alpha induction of the IRF1 gene', id: 0},
            {name: 'Glycolysis', id: 1},
            {name: 'MAPK cascade', id: 2},
            {name: 'PolyQ proteins interference', id: 3},
            {name: 'Insulin-like Growth Factor (IGF) signalling', id: 4},
            {name: 'ATM mediated phosphorylation of repair proteins', id: 5},
            {name: 'Vitamins B6 activation to pyridoxal phosphate', id: 6},
            {name: 'MTOR', id: 7}

        ]);


    

    //model.subscribe('messages');
    var userId = model.get('_session.userId');

    messagesQuery = model.query('messages', {
        room: room,
        date: {
            $gt: 0
        },
        targets: {
                $elemMatch:{id: userId}
            }
    });

    messagesQuery.subscribe(function (err) {

        if (err) {
            return next(err);
        }


        //just to initialize
        model.set('_page.doc.userIds',[model.get('_session.userId')]);

        model.subscribe('users');
        var  usersQuery = model.query('users', '_page.doc.userIds');
        usersQuery.subscribe(function (err) {
            if (err) {
                return next(err);
            }
            var  user = model.at('users.' + model.get('_session.userId'));



            userCount = model.at('chat.userCount');



            return userCount.fetch(function (err) {
                if(user.get()) {
                    if(user.get('colorCode') == null ){
                        user.set('colorCode', getNewColor());
                    }
                    if(user.get('name') != null)
                        return page.render();

                }
                if (err) {
                    return next(err);
                }

                return userCount.increment(function (err) {
                    if (err) {
                        return next(err);
                    }
                    user.set({
                        name: 'User ' + userCount.get(),
                        colorCode: getNewColor()
                    });

                    return page.render();

                });
            });
        });
    });
});



function getNewColor(){
    var gR = 1.618033988749895; //golden ratio
    var h = Math.floor((Math.random() * gR * 360));//Math.floor((cInd * gR - Math.floor(cInd * gR))*360);
    var cHsl = [h, 70 + Math.random() * 30, 60 + Math.random() * 10];

  //  return ('hsla('+cHsl[0]  +', '+ cHsl[1] + '%, ' + cHsl[2] +'%, 1)');
    var strHsl = 'hsl('+cHsl[0]  +', '+ cHsl[1] + '%, ' + cHsl[2] +'%)';

  return oneColor(strHsl).hex();


}


function triggerContentChange(divId){
    //TODO: triggering here is not good


    $(('#' + divId)).trigger('contentchanged');

}
function playSound() {
    try {
        document.getElementById('notificationAudio').play();
        if (!document)
            throw err;
    }
    catch (err) {
        return err;
    }


}



app.proto.changeDuration = function () {

    return this.model.filter('messages', 'biggerTime').ref('_page.list');


};

//TODO: open this
function updateServerGraph(){
    //hack: setTimeout has its own stack  -- waits for the stack to clear
     setTimeout(function(){
         menu.updateServerGraph();
     },0);
}

app.proto.init = function (model) {
    var timeSort;



    model.on('all', '_page.doc.cy.nodes.*', function(id, op, val, prev, passed){

        if(docReady &&  passed.user == null) {
            var node  = model.get('_page.doc.cy.nodes.' + id);

            if(!node || !node.id){ //node is deleted

               menu.deleteElement(id, false);

            }
        }


    });

    model.on('all', '_page.doc.cy.edges.*', function(id, op, val, prev, passed){


        if(docReady &&  passed.user == null) {
            var edge  = model.get('_page.doc.cy.edges.' + id); //check

            if(!edge|| !edge.id){ //edge is deleted
                menu.deleteElement(id, false);

            }
            //else insertion
        }

    });

    model.on('all', '_page.doc.sampleInd', function(op, ind, prev, passed){


        if(docReady && passed.user == null) {

            menu.updateSample(ind, false); //false = do not delete, sample changing client deleted them already

        }

    });



    model.on('all', '_page.doc.layoutProperties', function(index){


        if(docReady && menu ){
            var layoutProps = model.get('_page.doc.layoutProperties');

            menu.updateLayoutProperties(layoutProps);


        }

    });


    model.on('all', '_page.doc.cy.nodes.*', function(id, op, idName, prev, passed) {

        if (docReady && passed.user == null) {


        }
    });

    model.on('change', '_page.doc.cy.nodes.*.position', function(id, pos, prev, passed){

        if(docReady && passed.user == null){
            cy.getElementById(id).position(pos);

           // console.log(pos);
            //cy.getElementById(id)._private.position = pos;
        }


    });


    model.on('all', '_page.doc.cy.nodes.*.data', function(id, op, val, prev, passed){
        if(docReady && passed.user == null) {
            cy.getElementById(id)._private.data = CircularJSON.parse(val);
            cy.getElementById(id).data(CircularJSON.parse(val));
            cy.forceRender();
        }
    });


    model.on('all', '_page.doc.cy.nodes.*.style', function(id, op, val, prev, passed){
        if(docReady && passed.user == null) {

            cy.getElementById(id)._private.style =  CircularJSON.parse(val);
            cy.forceRender();

        }
    });



    model.on('all', '_page.doc.cy.nodes.*.classes', function(id, op, val, prev, passed){
        if(docReady && passed.user == null) {

            cy.getElementById(id)._private.classes =  CircularJSON.parse(val);
            //cy.getElementById(id).classes( CircularJSON.parse(val));
       //     console.log(  cy.getElementById(id)._private.classes );
            cy.forceRender();

        }
    });



    model.on('all', '_page.doc.cy.edges.*.data', function(id, op, val, prev, passed){
        if(docReady && passed.user == null) {
            cy.getElementById(id)._private.data = CircularJSON.parse(val);
            cy.forceRender();
        }
    });


    model.on('all', '_page.doc.cy.edges.*.style', function(id, op, val, prev, passed){
        if(docReady && passed.user == null) {

            cy.getElementById(id)._private.style =  CircularJSON.parse(val);
            cy.forceRender();

        }
    });


    model.on('all', '_page.doc.cy.edges.*.classes', function(id, op, val, prev, passed){
        if(docReady && passed.user == null) {

            cy.getElementById(id)._private.classes =  CircularJSON.parse(val);
            //cy.getElementById(id).classes( CircularJSON.parse(val));
            cy.forceRender();

        }
    });

    model.on('all', '_page.doc.cy.nodes.*.addedLater', function(id, op, idName, prev, passed){ //this property must be something that is only changed during insertion


        if(docReady && passed.user == null) {

            
              var pos = model.get('_page.doc.cy.nodes.'+ id + '.position');
              var sbgnlabel = model.get('_page.doc.cy.nodes.'+ id + '.sbgnlabel');
             var sbgnclass = model.get('_page.doc.cy.nodes.'+ id + '.sbgnclass');
              menu.addNode(id, pos.x, pos.y, sbgnclass, sbgnlabel,false);


        }

    });

    model.on('all', '_page.doc.cy.edges.*.addedLater', function(id,op, idName, prev, passed){//this property must be something that is only changed during insertion


        if(docReady && passed.user == null ){
            //check if edge id exists in the current inspector graph
            var source = model.get('_page.doc.cy.edges.'+ id + '.source');
            var target = model.get('_page.doc.cy.edges.'+ id + '.target');
            var sbgnclass = model.get('_page.doc.cy.edges.'+ id + '.sbgnclass');

            menu.addEdge(id, source, target, sbgnclass, false);

        }

    });





    model.on('change', '_page.doc.cy.nodes.*.highlightColor', function(id, highlightColor, prev,passed){

        if(docReady && passed.user == null) {

            var color;

            if (highlightColor != null)
                color =  highlightColor;
            else
                color = model.get('_page.doc.cy.nodes.' + id + '.backgroundColor'); //default background color


            cy.getElementById(id).css("background-color", color);



        }

    });



    model.on('all', '_page.doc.images', function() {
        if (docReady)
            triggerContentChange('receivedImages');
    });

    model.on('all', '_page.doc.history', function(){
        if(docReady){
            triggerContentChange('command-history-area');
        }
    });


    model.on('all', '_page.doc.undoIndex', function(){
        menu.refreshGlobalUndoRedoButtonsStatus();

    });
    model.on('insert', '_page.list', function (index) {


        var com = model.get('_page.list');
        var myId = model.get('_session.userId');


        if(docReady){
            triggerContentChange('messages');

        }

        if (com[com.length - 1].userId != myId) {

            playSound();

        }
    });


    timeSort = function (a, b) {

        return (a != null ? a.date : void 0) - (b != null ? b.date : void 0);
    };



    return model.sort('messages', timeSort).ref('_page.list');
};


app.proto.create = function (model) {
    model.set('_page.showTime', true);
    docReady = true;



    socket = io();

    var id = model.get('_session.userId');
    var name = model.get('users.' + id +'.name');
   socket.emit("subscribeHuman", {userName:name,room:  model.get('_page.room'), userId: id}, function(userList){

        var userIds =[];
        userList.forEach(function(user){
            userIds.push(user.userId);
        });

        model.set('_page.doc.userIds', userIds );
    }); //subscribe to current doc as a new room




    //to capture user disconnection, this has to be throuagh sockets-- not model
    socket.on('userList', function(userList){
        var userIds =[];
        userList.forEach(function(user){
            userIds.push(user.userId);
        });

        model.set('_page.doc.userIds', userIds );

    });

    // socket.on('loadFile', function(txtFile){
    //     menu.loadFile(txtFile);
    // });

    socket.on('newFile', function(){
        $('#new-file').trigger("click");
    });

    //better through sockets-- model operation causes complications
    socket.on('runLayout', function(){
        $("#perform-layout").trigger('click');
    });


    socket.on('addNode', function(data, callback){
        var nodeId = menu.addNode(null, data.x, data.y, data.sbgnclass, data.sbgnlabel, true);

        if(callback) callback(nodeId);

    });

    // socket.on('agentContextQuestion', function(socketId){
    //     setTimeout(function() {
    //         var answer = confirm("Do you agree with the context?");
    //         socket.emit('contextAnswer', {socketId: socketId, value:answer});
    //         //if (callback) callback(answer);
    //     }, 1000); //wait for the human to read
    //
    // });

    //TODO: make this a function in menu-functions
    socket.on('addCompound', function(data){

        //unselect all others
        cy.nodes().unselect();

        data.selectedNodeIds.forEach(function(nodeId){

            cy.getElementById( nodeId).select();
        });



        menu.addCompound(data.type);

    });


    modelManager = require('./public/sample-app/sampleapp-components/js/modelManager.js')(model, model.get('_page.room'), model.get('_session.userId'),name );



    menu =  require('./public/sample-app/sampleapp-components/js/sample-app-menu-functions.js')();


    //send modelManager to web client
    //make sure cytoscape is loaded
    menu.start(modelManager);




    this.atBottom = true;



    return model.on('all', '_page.list', (function (_this) {

        return function () {
            if (!_this.atBottom) {
                return;
            }
            return _this.container.scrollTop = _this.list.offsetHeight;
        };
    })(this));
};


app.proto.onScroll = function () {
    var bottom, containerHeight, scrollBottom;
    bottom = this.list.offsetHeight;
    containerHeight = this.container.offsetHeight;
    scrollBottom = this.container.scrollTop + containerHeight;

    return this.atBottom = bottom < containerHeight || scrollBottom > bottom - 10;

};


app.proto.changeColorCode = function(){

    var  user = this.model.at('users.' + this.model.get('_session.userId'));

    user.set('colorCode', getNewColor());

};
app.proto.runUnitTests = function(){
    require("./public/test/testsMenuFunctions.js")();
    require("./public/test/testsModelManager.js")();

    require("./public/test/testOptions.js")(); //to print out results

}



app.proto.add = function (model, filePath) {

    if(model == null)

        model = this.model;
    this.atBottom = true;



        var comment;
        comment = model.del('_page.newComment'); //to clear  the input box
        if (!comment) {
            return;
        }

        var targets  = [];
        var users = model.get('_page.doc.userIds');

        var myId = model.get('_session.userId');
        for(var i = 0; i < users.length; i++){
            var user = users[i];
            if(user == myId ||  document.getElementById(user).checked){
                targets.push({id: user});
            }
        }

        var msgUserId = model.get('_session.userId');
        var msgUserName = model.get('users.' + msgUserId +'.name');

        model.add('messages', {
            room: model.get('_page.room'),
            targets: targets,
            userId: msgUserId,
            userName: msgUserName,
            comment: comment,
            date: -1//val //server assigns the correct time
        });




    //append image  after updating the message list on the page
        //if(filePath!=null) {
        //    var msgs = $("div[class='message']");
        //    //append this to the message with the filepath as a thumbnail
        //    $("div[class='message']").each(function (index, element) {
        //        if ($(element).context.innerHTML.indexOf(filePath) > -1) {
        //            $(element).append("<div class = 'receivedImage' ></div>");
        //        //
        //        }
        //    });
        //

//s        }
};




app.proto.uploadFile = function(evt){

    try{
        var room = this.model.get('_page.room');
        var fileStr = this.model.get("_page.newFile").split('\\');
        var filePath = fileStr[fileStr.length-1];

        var file = evt.target.files[0];

        var reader = new FileReader();
        reader.onload = function(evt){
            modelManager.addImage({ img: evt.target.result,room: room, filePath: filePath});

        };

        reader.readAsDataURL(file);

        //Add file name as a text message
        this.model.set('_page.newComment', "Sent image: "  + filePath );

        this.app.proto.add(this.model, filePath);


    }
    catch(error){ //clicking cancel when the same file is selected causes error
        console.log(error);

    }
};


app.proto.count = function (value) {
    return Object.keys(value || {}).length;
};



app.proto.formatTime = function (message) {
    var hours, minutes, seconds, period, time;
    time = message && message.date;
    if (!time) {
        return;
    }
    time = new Date(time);
    hours = time.getHours();

    minutes = time.getMinutes();

    seconds = time.getSeconds();

    if (minutes < 10) {
        minutes = '0' + minutes;
    }
    if (seconds < 10) {
        seconds = '0' + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
};

app.proto.formatObj = function(obj){

    return JSON.stringify(obj);
};


