/* 
 * Package: manager.js
 *
 * Namespace: bbopx.minerva.manager
 *
 * jQuery manager for communication with Minerva (via Barista).
 *
 * See also:
 *  <bbopx.barista.response>
 */

if ( typeof bbopx == "undefined" ){ var bbopx = {}; }
if ( typeof bbopx.minerva == "undefined" ){ bbopx.minerva = {}; }

/*
 * Constructor: manager
 * 
 * A manager for handling the AJAX and registry.
 * Initial take from bbop.golr.manager.
 * 
 * Arguments:
 *  barista_location - string for invariant part of API
 *  namespace - string for namespace of API to use
 *  app_blob - JSON object that defines targets
 *  user_token - identifying string for the user of the manager (Barista token)
 *  engine - *[optional]* AJAX manager client to use (default: jquery)
 *  use_jsonp - *[optional]* wrap requests in JSONP (only usable w/jquery, default: true)
 * 
 * Returns:
 *  a classic manager
 */
bbopx.minerva.manager = function(barista_location, namespace, user_token, 
				 engine, use_jsonp){
    bbop.registry.call(this, ['prerun', // internal; anchor only
			      'postrun', // internal
			      'manager_error', // internal/external...odd
			      //'success', // uninformative
			      'merge',
			      'rebuild',
			      'meta',
			      'warning', // trump
			      'error' //trump
			     ]);
    this._is_a = 'bbopx.minerva.manager';
    var anchor = this;

    // Aliases.
    var each = bbop.core.each;
    var is_empty = bbop.core.is_empty;

    //var url = barista_location + '/api/' + namespace + '/m3Batch';
    anchor._url = null;
    // 
    anchor._user_token = user_token;

    // Will use this one other spot, where the user can change the
    // token.
    function _set_url_from_token(in_token){	
	var url = null;
	if( in_token ){
	    url = barista_location + '/api/' + namespace + '/m3BatchPrivileged';
	}else{
	    url = barista_location + '/api/' + namespace + '/m3Batch';
	}
	anchor._url = url;
	return url;
    }
    _set_url_from_token(user_token);

    // // Helper function to add get_undo_redo when the user token
    // // (hopefully good) is defined.
    // function _add_undo_redo_req(req_set, model_id){
    // 	if( anchor._user_token ){
    // 	    var req = new bbopx.minerva.request('model', 'get-undo-redo');
    // 	    req.model(model_id);
    // 	    req_set.add(req);
    // 	}
    // }

    // Select an internal manager for handling the unhappiness of AJAX
    // callbacks.
    var jqm = null;
    if( ! engine ){ engine = 'jquery'; } // default to jquery
    if( engine.toLowerCase() == 'jquery' ){
	jqm = new bbop.rest.manager.jquery(bbopx.barista.response);
    }else if( engine.toLowerCase() == 'node' ){
	jqm = new bbop.rest.manager.node(bbopx.barista.response);
    }else{
	// Default to jQuery.
	engine = 'jquery';
	jqm = new bbop.rest.manager.jquery(bbopx.barista.response);
    }

    // Should JSONP be used for these calls, only for jQuery.
    if( engine.toLowerCase() == 'jquery' ){
	var jsonp_p = true;
	if( typeof(use_jsonp) !== 'undefined' && ! use_jsonp ){
	    jsonp_p = false;
	}
	jqm.use_jsonp(true); // we are definitely doing this remotely
    }

    // How to deal with failure.
    function _on_fail(resp, man){
	// See if we got any traction.
	if( ! resp || ! resp.message_type() || ! resp.message() ){
	    // Something dark has happened, try to put something
	    // together.
	    // console.log('bad resp!?: ', resp);
	    var resp_seed = {
		'message_type': 'error',
		'message': 'deep manager error'
	    };
	    resp = new bbopx.barista.response(resp_seed);
	}
	anchor.apply_callbacks('manager_error', [resp, anchor]);
    }
    jqm.register('error', 'foo', _on_fail);

    // When we have nominal success, we still need to do some kind of
    // dispatch to the proper functionality.
    function _on_nominal_success(resp, man){
	
	// Switch on message type when there isn't a complete failure.
	var m = resp.message_type();
	if( m == 'error' ){
	    // Errors trump everything.
	    anchor.apply_callbacks('error', [resp, anchor]);
	}else if( m == 'warning' ){
	    // Don't really have anything for warning yet...remove?
	    anchor.apply_callbacks('warning', [resp, anchor]);
	}else if( m == 'success' ){
	    var sig = resp.signal();
	    if( sig == 'merge' || sig == 'rebuild' || sig == 'meta' ){
		//console.log('run on signal: ' + sig);
		anchor.apply_callbacks(sig, [resp, anchor]);		
	    }else{
		alert('unknown signal: very bad');
	    }
	}else{
	    alert('unimplemented message_type');	    
	}

	// Postrun goes no matter what.
	anchor.apply_callbacks('postrun', [resp, anchor]);
    }
    jqm.register('success', 'bar', _on_nominal_success);

    ///
    /// Control our identity.
    ///

    /*
     * Method: user_id
     * 
     * DEPRECATED: use user_token()
     * 
     * Arguments:
     *  user_id - string
     * 
     * Returns:
     *  user token
     */
    anchor.user_id = function(user_token){
	return anchor.user_token(user_token);
    };

    /*
     * Method: user_token
     * 
     * Get/set the user token.
     * 
     * Arguments:
     *  user_token - string
     * 
     * Returns:
     *  current user token
     */
    anchor.user_token = function(user_token){

	// Adjust the internal token.
	if( user_token ){
	    anchor._user_token = user_token;
	}

	// Make sure we're using the right URL considering how we're
	// identified.
	_set_url_from_token(anchor._user_token);

	return anchor._user_token;
    };

    ///
    /// Actual mechanism.
    ///

    /*
     * Method: get_model
     * 
     * Trigger a rebuild <bbopx.barista.response> with a model.
     * 
     * Intent: "query".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.get_model = function(model_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.get_model();

 	anchor.request_with(reqs);
    };
    
    // /*
    //  * Method: get_model_ids
    //  * 
    //  * Trigger meta <bbopx.barista.response> with a list of all model
    //  * ids.
    //  * 
    //  * Intent: "query".
    //  * Expect: "success" and "meta".
    //  * 
    //  * Arguments:
    //  *  n/a
    //  * 
    //  * Returns:
    //  *  n/a
    //  */
    // anchor.get_model_ids = function(){

    // 	// 
    // 	var reqs = new bbopx.minerva.request_set(anchor.user_token());
    // 	var req = new bbopx.minerva.request('model', 'all-model-ids');
    // 	reqs.add(req);

    // 	var args = reqs.callable();	
    // 	anchor.apply_callbacks('prerun', [anchor]);
    // 	jqm.action(anchor._url, args, 'GET');
    // };
    
    /*
     * Method: get_meta
     * 
     * Trigger meta <bbopx.barista.response> with a list of all model
     * meta-information.
     * 
     * Intent: "query".
     * Expect: "success" and "meta".
     * 
     * Arguments:
     *  n/a
     * 
     * Returns:
     *  n/a
     */
    anchor.get_meta = function(){

	var reqs = new bbopx.minerva.request_set(anchor.user_token());
	reqs.get_meta();

 	anchor.request_with(reqs);
    };

    /*
     * Method: get_model_undo_redo
     * 
     * Trigger meta <bbopx.barista.response> of requested model's
     * undo/redo information.
     * 
     * This will make the request whether or not the user has an okay
     * token defined (as opposed to the helper function
     * _add_undo_redo()).
     *
     * Intent: "query".
     * Expect: "success" and "meta".
     * 
     * Arguments:
     *  model_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.get_model_undo_redo = function(model_id){

	// 
	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.get_undo_redo();

 	anchor.request_with(reqs);
    };
    
    /*
     * Method: perform_undo
     * 
     * Trigger rebuild <bbopx.barista.response> after an attempt to
     * roll back the model to "last" state.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.perform_undo = function(model_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.undo_last_model_batch();

 	anchor.request_with(reqs);
    };
    
    /*
     * Method: perform_redo
     * 
     * Trigger rebuild <bbopx.barista.response> after an attempt to
     * roll forward the model to "next" state.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.perform_redo = function(model_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.redo_last_model_batch();

 	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_fact
     * 
     * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
     * on attempt to add a single fact to a model.
     *
     * Intent: "action".
     * Expect: "success" and "merge".
     * 
     * Arguments:
     *  model_id - string
     *  source_id - string
     *  target_id - string
     *  rel_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.add_fact = function(model_id, source_id, target_id, rel_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_fact([source_id, target_id, rel_id]);

 	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_fact
     * 
     * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
     * on attempt to remove a single fact to a model.
     *
     * Intent: "action".
     * Expect: "success" and "merge".
     * 
     * Arguments:
     *  model_id - string
     *  source_id - string
     *  target_id - string
     *  rel_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_fact = function(model_id, source_id, target_id, rel_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_fact([source_id, target_id, rel_id]);

 	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_simple_composite
     * 
     * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
     * on attempt to add a simple composite unit (class, enabled_by,
     * and occurs_in) to a model.
     *
     * Intent: "action".
     * Expect: "success" and "merge".
     * 
     * Arguments:
     *  model_id - string
     *  cls_exp - anything taken by <bbopx.minerva.class_expression>
     *  enabled_by_expr - *[optional]* anything taken by <bbopx.minerva.class_expression>
     *  occurs_in_expr - *[optional]* anything taken by <bbopx.minerva.class_expression>
     * 
     * Returns:
     *  n/a
     */
    anchor.add_simple_composite = function(model_id, cls_expr,
    					   enabled_by_expr, occurs_in_expr){

	// Minimal requirements.
	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
     	var ind = reqs.add_individual(cls_expr);

	// Optional set expressions.
	if( enabled_by_expr ){
	    reqs.add_type_to_individual(
		bbopx.minerva.class_expression.svf(enabled_by_expr,
						   'RO:0002333'),
	    ind);
	}
	if( occurs_in_expr ){
	    reqs.add_type_to_individual(
		bbopx.minerva.class_expression.svf(occurs_in_expr,
						   'occurs_in'),
	    ind);
	}

 	anchor.request_with(reqs);
    };
    
    // /*
    //  * Method: add_class
    //  * 
    //  * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
    //  * on attempt to add just a class (instance of a class) to an
    //  * individual in a model.
    //  *
    //  * Intent: "action".
    //  * Expect: "success" and "merge".
    //  * 
    //  * Arguments:
    //  *  model_id - string
    //  *  individual_id - string
    //  *  class_id - string
    //  * 
    //  * Returns:
    //  *  n/a
    //  */
    // anchor.add_class = function(model_id, individual_id, class_id){

    // 	// 
    // 	var reqs = new bbopx.minerva.request_set(anchor.user_token());
    // 	var req = new bbopx.minerva.request('individual', 'add-type');
    // 	req.model(model_id);
    // 	req.individual(individual_id);
    // 	req.add_class_expression(class_id);

    // 	reqs.add(req);

    // 		anchor.request_with(reqs);
    // };
    
    // /*
    //  * Method: add_svf
    //  * 
    //  * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
    //  * on attempt to add an SVF expression to an individual in a
    //  * model.
    //  *
    //  * Intent: "action".
    //  * Expect: "success" and "merge".
    //  * 
    //  * Arguments:
    //  *  model_id - string
    //  *  individual_id - string
    //  *  class_id - string
    //  *  property_id - string
    //  * 
    //  * Returns:
    //  *  n/a
    //  */
    // anchor.add_svf = function(model_id, individual_id, class_id, property_id){

    // 	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
    // 	reqs.add_svf_expression(type, individual_id);

    // 	// 
    // 	var reqs = new bbopx.minerva.request_set(anchor.user_token());
    // 	var req = new bbopx.minerva.request('individual', 'add-type');
    // 	req.model(model_id);
    // 	req.individual(individual_id);
    // 	req.add_svf_expression(class_id, property_id);

    // 	reqs.add(req);

    // 		anchor.request_with(reqs);
    // };
    
    // /*
    //  * Method: remove_class
    //  * 
    //  * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
    //  * on attempt to remove a class from an individual in a model.
    //  *
    //  * Intent: "action".
    //  * Expect: "success" and "merge".
    //  * 
    //  * Arguments:
    //  *  model_id - string
    //  *  individual_id - string
    //  *  class_id - string
    //  * 
    //  * Returns:
    //  *  n/a
    //  */
    // anchor.remove_class = function(model_id, individual_id, class_id){

    // 	// 
    // 	var reqs = new bbopx.minerva.request_set(anchor.user_token());
    // 	var req = new bbopx.minerva.request('individual', 'remove-type');
    // 	req.model(model_id);
    // 	req.individual(individual_id);
    // 	req.add_class_expression(class_id);

    // 	reqs.add(req);

    // 		anchor.request_with(reqs);
    // };
    
    /*
     * Method: add_class_expression
     * 
     * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
     * on attempt to add a complex class expression to an individual
     * in a model.
     *
     * Intent: "action".
     * Expect: "success" and "merge".
     * 
     * Arguments:
     *  model_id - string
     *  individual_id - string
     *  cls_expr - anything acceptible to <bbopx.minerva.class_expression>
     * 
     * Returns:
     *  n/a
     */
    anchor.add_class_expression = function(model_id, individual_id, cls_expr){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_type_to_individual(cls_expr, individual_id);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_class_expression
     * 
     * Trigger merge (or possibly a rebuild) <bbopx.barista.response>
     * on attempt to remove a complex class expression from an
     * individual in a model.
     *
     * Intent: "action".
     * Expect: "success" and "merge".
     * 
     * Arguments:
     *  model_id - string
     *  individual_id - string
     *  cls_expr - anything acceptible to <bbopx.minerva.class_expression>
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_class_expression = function(model_id, individual_id, cls_expr){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_type_from_individual(cls_expr, individual_id);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_individual
     * 
     * Trigger a rebuild <bbopx.barista.response> on attempt to remove
     * an individual from a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  individual_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_individual = function(model_id, indv_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_individual(indv_id);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_model
     * 
     * Trigger a rebuild response <bbopx.barista.response> on
     * attempting to create a new model...from nothing. Or something!
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  taxon_id - *[DEPRECATED]* *[optional]* string (full ncbi)
     *  class_id - *[DEPRECATED]* *[optional]* string
     * 
     * Returns:
     *  n/a
     */
    anchor.add_model = function(taxon_id, class_id){

	// Conditions taken care of by request_set.
	var reqs = new bbopx.minerva.request_set(anchor.user_token());
	reqs.add_model({'class-id': class_id, 'taxon_id': taxon_id});
	
	anchor.request_with(reqs);
    };
    
    /*
     * Method: export_model
     * 
     * *[DEPRECATED]*
     * 
     * Trigger a meta <bbopx.barista.response> containing model export
     * text.
     *
     * Intent: "action".
     * Expect: "success" and "meta".
     * 
     * Arguments:
     *  model_id - string
     *  format - *[optional]* string (for legacy, "gaf" or "gpad")
     * 
     * Returns:
     *  n/a
     */
    anchor.export_model = function(model_id, format){

	if( typeof(format) === 'undefined' ){ format = 'default'; }

	var reqs = new bbopx.minerva.request_set(anchor.user_token());
	var req = null;
	if( format == 'gaf' ){
	    req = new bbopx.minerva.request('model', 'export-legacy');
	    req.special('format', 'gaf');
	}else if( format == 'gpad' ){
	    req = new bbopx.minerva.request('model', 'export-legacy');
	    req.special('format', 'gpad');
	}else{
	    // Default (non-legacy) case is simpler.
	    req = new bbopx.minerva.request('model', 'export');
	}

	// Add the model to the request.
	req.model(model_id);
	reqs.add(req);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: import_model
     * 
     * *[DEPRECATED]*
     * 
     * Trigger a rebuild response <bbopx.barista.response> for a new
     * model seeded/created from the argument string.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_string - string representation of a model
     * 
     * Returns:
     *  n/a
     */
    anchor.import_model = function(model_string){

	// 
	var reqs = new bbopx.minerva.request_set(anchor.user_token());
	var req = new bbopx.minerva.request('model', 'import');
	req.special('importModel', model_string);
	reqs.add(req);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: store_model
     * 
     * Trigger a rebuild response <bbopx.barista.response> on a
     * "permanent" store operation on a model.
     *
     * What?! A "rebuild" and not "meta"? Yes. This allows a workflow
     * where a model is created, edited, and stored all in one pass.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.store_model = function(model_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.store_model();

	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_individual_evidence
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * evidence addition referencing an individual in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  indv_id - string
     *  evidence_id - string
     *  source_ids - string or list of strings
     * 
     * Returns:
     *  n/a
     */
    anchor.add_individual_evidence = function(model_id, indv_id,
					      evidence_id, source_ids){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_evidence(evidence_id, source_ids, indv_id, model_id);
	
	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_fact_evidence
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * evidence addition referencing a fact in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  source_id - string
     *  target_id - string
     *  rel_id - string
     *  evidence_id - string
     *  source_ids - string or list of strings
     * 
     * Returns:
     *  n/a
     */
    anchor.add_fact_evidence = function(model_id,
					source_id, target_id, rel_id,
					evidence_id, source_ids){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_evidence(evidence_id, source_ids,
			  [source_id, target_id, rel_id], model_id);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_evidence
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * evidence addition referencing an individual in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  evidence_individual_id - string
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_evidence = function(model_id, evidence_individual_id){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_evidence(evidence_individual_id, model_id);
	
	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_individual_annotation
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * annotation addition to an individual in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  indv_id - string
     *  key - string
     *  value - string
     * 
     * Returns:
     *  n/a
     */
    anchor.add_individual_annotation = function(model_id, indv_id, key, value){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_annotation_to_individual(key, value, indv_id);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_fact_annotation
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * annotation addition to a referenced fact (edge) in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  source_id - string
     *  target_id - string
     *  rel_id - string
     *  key - string
     *  value - string
     * 
     * Returns:
     *  n/a
     */
    anchor.add_fact_annotation = function(model_id,
					  source_id, target_id, rel_id,
					  key, value){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_annotation_to_fact(key, value, [source_id, target_id, rel_id]);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: add_model_annotation
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * annotation addition to a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  key - string
     *  value - string
     * 
     * Returns:
     *  n/a
     */
    anchor.add_model_annotation = function(model_id, key, value){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.add_annotation_to_model(key, value);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_individual_annotation
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * annotation removeal from an individual in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  indv_id - string
     *  key - string
     *  value - string
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_individual_annotation =function(model_id, indv_id, key, value){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_annotation_from_individual(key, value, indv_id);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_fact_annotation
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * annotation removeal from a referenced fact (edge) in a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  source_id - string
     *  target_id - string
     *  rel_id - string
     *  key - string
     *  value - string
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_fact_annotation = function(model_id,
					     source_id, target_id, rel_id,
					     key, value){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_annotation_from_fact(key, value,
					 [source_id, target_id, rel_id]);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: remove_model_annotation
     * 
     * Trigger a rebuild response <bbopx.barista.response> on an
     * annotation removal from a model.
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  model_id - string
     *  key - string
     *  value - string
     * 
     * Returns:
     *  n/a
     */
    anchor.remove_model_annotation = function(model_id, key, value){

	var reqs = new bbopx.minerva.request_set(anchor.user_token(), model_id);
	reqs.remove_annotation_from_model(key, value);

	anchor.request_with(reqs);
    };
    
    /*
     * Method: capella_bootstrap_model
     * 
     * DEPRECATED: This is currently very very old code and is mostly
     * here as a bookmark on where to restart.
     * 
     * Trigger a rebuild response <bbopx.barista.response> on
     * attempting to create a new model with information provided by
     * Capella.
     *
     * If you're attempting to use this, you probably want to revisit
     * everything and everbody first...
     *
     * Intent: "action".
     * Expect: "success" and "rebuild".
     * 
     * Arguments:
     *  bootstrap_obj - JSON object ???
     *  term2aspect - ???
     * 
     * Returns:
     *  n/a
     */
    anchor.capella_bootstrap_model = function(bootstrap_obj, term2aspect){

	var reqs = new bbopx.minerva.request_set(anchor.user_token());

	// Just get a new model going.
	var req = new bbopx.minerva.request('model', 'generate-blank');
	//req.special('db', db_id); // unecessary
	reqs.add(req);

	each(bootstrap_obj, function(ob){

	    // Now, for each of these, we are going to be adding
	    // stuff to MF instances. If there is no MF coming
	    // in, we are just going to use GO:0003674.
	    var mfs = [];
	    var bps = [];
	    var ccs = [];
	    each(ob['terms'], function(tid){
		if( term2aspect[tid] == 'molecular_function' ){
		    mfs.push(tid);
		}else if( term2aspect[tid] == 'biological_process' ){
		    bps.push(tid);
		}else if( term2aspect[tid] == 'cellular_component' ){
		    ccs.push(tid);
		}
	    });
	    // There must be this no matter what.
	    if( is_empty(mfs) ){
 		mfs.push('GO:0003674');
	    }

	    // We are going to be creating instances off of the
	    // MFs.
	    each(mfs, function(mf){
		var req = new bbopx.minerva.request('individual', 'add');
			  
		// Add in the occurs_in from CC.
		each(ccs, function(cc){
		    req.add_svf_expression(cc, 'occurs_in');
		});

		// Add in the enabled_by from entities.
		each(ob['entities'], function(ent){
		    req.add_svf_expression(ent, 'RO:0002333');
		});
	    });
	});


	// Final send-off.
	anchor.request_with(reqs);
    };
    
    /*
     * Method: request_with
     * 
     * Make a custom request with your own request set.
     *
     * Intent: ??? - whatever you set
     * Expect: "success" and ??? (depends on your request)
     * 
     * Arguments:
     *  request_set - <bbopx.noctua.request_set>
     *  model_id - *[TODO?]* string
     * 
     * Returns:
     *  n/a
     */
    anchor.request_with = function(request_set, model_id){
	// Run.
	var args = request_set.callable();	
    	anchor.apply_callbacks('prerun', [anchor]);
    	jqm.action(anchor._url, args, 'GET');
    };    
    
};
bbop.core.extend(bbopx.minerva.manager, bbop.registry);
