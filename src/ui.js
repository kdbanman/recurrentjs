var learnIntervalId = null;
$(function() {

  var isLearning = function () {
    return learnIntervalId != null;
  };

  var startLearning = function () {
    if(!isLearning()) {
      learnIntervalId = setInterval(tick, 0);
    }
  };

  var stopLearning = function () {
    if(isLearning()) { clearInterval(learnIntervalId); }
    learnIntervalId = null;
  };

  // attach button handlers
  $('#learn').click(function(){
    stopLearning();
    reinit();
  });
  $('#step').click(function() {
    tick();
  });
  $('#stop').click(function(){
    stopLearning();
  });
  $("#resume").click(function(){
    startLearning();
  });

  $("#savemodel").click(saveModel);
  $("#loadmodel").click(function(){
    var j = JSON.parse($("#tio").val());
    loadModel(j);
  });

  $("#loadpretrained").click(function(){
    $.getJSON("lstm_100_model.json", function(data) {
      pplGraph = new Rvis.Graph();
      learning_rate = 0.0001;
      reinit_learning_rate_slider();
      loadModel(data);
    });
  });

  $("#sample_network").click(function(){
    var shouldRestart = isLearning();
    stopLearning();

    $('#samples .apred').last().remove()
    var pred = sampleNetwork();
    var pred_div = '<div class="apred">'+pred+'</div>'
    $('#samples').prepend(pred_div);

    if (shouldRestart) {
      startLearning();
    }
  });

  $("#temperature_slider").slider({
    min: -1,
    max: 1.05,
    step: 0.05,
    value: 0,
    slide: function( event, ui ) {
      sample_softmax_temperature = Math.pow(10, ui.value);
      $("#temperature_text").text( sample_softmax_temperature.toFixed(2) );
    }
  });

  // MAIN ENTRY POINT
  // Initialize the network
  reinit();
});
