var learnIntervalId = null;
$(function() {

  // attach button handlers
  $('#learn').click(function(){
    reinit();
    if(learnIntervalId !== null) { clearInterval(learnIntervalId); }
    learnIntervalId = setInterval(tick, 0);
  });
  $('#stop').click(function(){
    if(learnIntervalId !== null) { clearInterval(learnIntervalId); }
    learnIntervalId = null;
  });
  $("#resume").click(function(){
    if(learnIntervalId === null) {
      learnIntervalId = setInterval(tick, 0);
    }
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

  $("#learn").click(); // simulate click on startup

  //$('#gradcheck').click(gradCheck);

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
});
