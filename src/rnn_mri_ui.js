var learnIntervalId = null;
var weightsComponent = null;
$(function () {

  var learnOnce = function () {
    tick();
    weightsComponent.render();
  }

  var isLearning = function () {
    return learnIntervalId != null;
  };

  var startLearning = function () {
    if(!isLearning()) {
      learnIntervalId = setInterval(learnOnce, 0);
    }
  };

  var stopLearning = function () {
    if(isLearning()) {
      clearInterval(learnIntervalId);
    }
    learnIntervalId = null;
  };

  $('#js-reinitialize_weights').click(function () {
    stopLearning();
    reinit();
    weightsComponent.setNewModel(model);
  });
  $('#js-train_once').click(learnOnce);
  $('#js-pause_training').click(stopLearning);
  $("#js-train_continuously").click(startLearning);

  $("#sample_network").click(function () {
    var shouldRestart = isLearning();
    stopLearning();

    $('#hot_samples .generated_sample').last().remove();
    var generatedSentence = sampleNetwork();
    var generatedSentenceDiv = '<div class="generated_sample">'+generatedSentence+'</div>'
    $('#hot_samples').prepend(generatedSentenceDiv);

    $('#argmax_samples .generated_sample').last().remove();
    var argmaxGeneratedSentence = sampleNetworkGreedy();
    var argmaxGeneratedSentenceDiv = '<div class="generated_sample">'+argmaxGeneratedSentence+'</div>'
    $('#argmax_samples').prepend(argmaxGeneratedSentenceDiv);

    if (shouldRestart) {
      startLearning();
    }
  });

  $("#temperature_slider").slider({
    min: -1,
    max: 1.05,
    step: 0.05,
    value: 0,
    slide: function (_, ui) {
      sampleSoftmaxTemperature = Math.pow(10, ui.value);
      $("#temperature_text").text( sampleSoftmaxTemperature.toFixed(2) );
    }
  });

  // MAIN ENTRY POINT
  // Initialize the network
  reinit();
  weightsComponent = new WeightsComponent({
    model: model,
    parentElement: $('#js-weights_visualization')
  });
});
