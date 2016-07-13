
    /**
     * Created by durupina on 5/13/16.
     */

    ContextAgent.prototype = new Agent();

    //ContextAgent.prototype.constructor = ContextAgent;

    function ContextAgent(name, id) {

        this.agentName = name;
        this.agentId = id;
        


        this.contextList = []; //contextName, proteinName, relevance, confidence


        this.CONFIDENCE_THRESHOLD = 5;

        this.RELEVANCE_THRESHOLD = 0.005; //over 5%
    }

    ContextAgent.prototype.initContext = function(){
        if(this.pageDoc.context!=null)
            this.contextList = this.pageDoc.context;
    }



    ContextAgent.prototype.analyzeOperation = function (op, callback) {

        var self = this;
        
        var nodes = self.getNodeList();
        var edges = self.getEdgeList();

        //if op == delete reduce score

        if(op.elId!=null) {

            if(op.elType == "node") {
                var node = nodes[op.elId];
                if(op.opName == "add")
                    self.updateNodeContribution(node, 1, callback);
                else if(op.opName == "delete")
                    self.updateNodeContribution(node, -1, callback);
                else
                    self.updateNodeContribution(node, 1, callback);

            }
            else if(op.elType == "edge") {


                if(op.opName == "add"){
                    var sourceNode = edges[op.param.source];
                    var targetNode = edges[op.param.target];

                    self.updateNodeContribution(sourceNode, 1, callback);
                    self.updateNodeContribution(targetNode, 1, callback);
                }
                else if(op.opName == "delete"){
                    if(op.param != null && op.param.source!= null &&  op.param.target!= null) {
                        var sourceNode = edges[op.param.source];
                        var targetNode = edges[op.param.target];
                        self.updateNodeContribution(sourceNode, -1, callback);
                        self.updateNodeContribution(targetNode, -1, callback);
                    }
                }
            }

            else if( op.opName == "set") //treat them as a list


                op.elId.forEach(function (el) {

                    if (el.isNode) {
                        self.updateNodeContribution(nodes[el.id], 1, callback);
                    }
                    else{
                        self.updateNodeContribution(edges[el.source], 1, callback);
                        self.updateNodeContribution(edges[el.target], 1, callback);
                    }
                });
                
            }


    }


    /**
     * Increase the contribution of protein "node" in proteinList by relVal
     * @param node
     * TODO: contribution values to be tweaked
     * @param scoreContribution: User interest score contribution which can be + or -
     */
    ContextAgent.prototype.updateNodeContribution = function(node, scoreContribution, callback){
        if(node == null)
            return;
        var self = this;


        //proteins
        if(node.sbgnlabel && node.sbgnclass && ( (node.sbgnclass.indexOf("macromolecule")>-1 || node.sbgnclass.indexOf("nucleic")>-1 || node.sbgnclass.indexOf("chemical")>-1))){
            var proteinName = node.sbgnlabel;


            var exists = false;
            self.contextList.forEach(function(context) {
                if (context.proteinName == proteinName) { //update this for each context associated with the protein
                    exists = true;
                    context.confidence += scoreContribution;
                }

            });
            if(exists){
                if(callback) callback();
            }

            if(!exists){
                //call portal query to update context related to the protein
                //get all the context data
                this.sendRequest("agentCBioPortalQueryRequest", proteinName, function(cancerData){
                    //        self.printMutationData(cancerData);
                    for(var ind = 0; ind < cancerData.length; ind++){
                        var data = cancerData[ind];
                        if(data.seqCaseCnt > 0) {
                            var relevance = data.mutationCaseIds.length / data.seqCaseCnt;

                            if (relevance >= self.RELEVANCE_THRESHOLD) { //no need to push the ones with smaller scores
                                //   var endInd = data.name.indexOf("(") < 0 ? data.name.length: data.name.indexOf("(");
                                //  var name = data.name.slice(0, endInd);
                                self.contextList.push({
                                    proteinName: proteinName,
                                    relevance: relevance, //relevance value returned by the portal query
                                    confidence: scoreContribution,
                                    contextName: data.name

                                });

                            }
                        }

                    };


                    if(callback) callback();
                });

            }
        }
    }

    /**
     * Update context scores at each operation
     * @param op
     */
    ContextAgent.prototype.updateContext = function(op, callback){
        var self = this;


        self.analyzeOperation(op, function(){ //requests a query call if necessary, hence the callback

            var contextInd = self.findBestContext();

            if(contextInd>-1) {
                self.informAboutContext(self.contextList[contextInd]);

                //send updated contextlist to the server
                self.sendRequest("agentContextUpdate", {param: self.contextList});

                self.socket.on('contextAnswerValue', function (answer) {
                    console.log("here");
                    if (answer == true)
                        self.contextList[contextInd].confidence *= 2;
                    else
                        self.contextList[contextInd].confidence *= 0.5;

                    if (callback) callback();
                });
            }

        }); //updates node contribution



    }


    ContextAgent.prototype.printMutationData = function(cancerData){
        cancerData.forEach(function(study) {
            if(study.seqCaseCnt > 0)
                console.log(study.id +  ": %"+  (study.mutationCaseIds.length*100/study.seqCaseCnt));

        });
    }

    ContextAgent.prototype.findBestContext = function(){
        var self = this;
        var likelyContext;

        var maxScore = - 100000;
        var maxContextInd = -1;
        var ind = 0;
        self.contextList.forEach(function(context){
            var score = context.relevance * context.confidence;
            if (score > maxScore) {
                maxScore = score;
                maxContextInd = ind;
            }
            ind++;
        });

        return maxContextInd;
    }

    ContextAgent.prototype.informAboutContext = function(context){

        var self = this;

        var agentComment = "The most likely context is  " + context.contextName + " with %" + (context.relevance.toFixed(2));
        
        var targets = [];
        for(var i = 0; i < self.userList.length; i++){ //FIXME: send to all the users for now
            targets.push({id: agent.userList[i].userId});
        }

        
        self.sendMessage(agentComment, targets);

    }





    /**
     *
     * @param name
     * @param relevance : context relevance percentage found from portal
     * @param confContribution: to be added to the confidence
     */
    ContextAgent.prototype.updateContextList = function(contextName,  relevance, confContribution ) {

    var self = this;
    var ind = self.contextList.findIndex(function (context) {
        return (context.contextName == contextName);
    });

    if(ind > 0) {
        self.contextList[ind].relevance = relevance;
        self.contextList[ind].confidence += confContribution;
    }
}





    ContextAgent.prototype.evaluateAnswer = function(contextName, answer){
        if(answer.toLowerCase().search("ye") > -1 )  //yes
            self.updateContextList(contextName,  0, 3); //don't change relevance, just increase confidence by 3

        else if (answer.toLowerCase().search("no")> -1)
            self.updateContextList(contextName, 0, -3); //don't change relevance, just decrease confidence by 3

        //else don't change confidence
    }