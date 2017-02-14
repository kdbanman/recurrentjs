var learnIntervalId = null;
$(function () {

  var isLearning = function () {
    return learnIntervalId != null;
  };

  var startLearning = function () {
    if(!isLearning()) {
      learnIntervalId = setInterval(tick, 0);
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
  });
  $('#js-train_once').click(function () {
    tick();
  });
  $('#js-pause_training').click(function () {
    stopLearning();
  });
  $("#js-train_continuously").click(function () {
    startLearning();
  });

  $("#sample_network").click(function () {
    var shouldRestart = isLearning();
    stopLearning();

    $('#hot_samples .generated_sample').last().remove();
    var pred = sampleNetwork();
    var pred_div = '<div class="generated_sample">'+pred+'</div>'
    $('#hot_samples').prepend(pred_div);

    $('#argmax_samples .generated_sample').last().remove();
    var argmax_pred = sampleNetworkGreedy();
    var argmax_pred_div = '<div class="generated_sample">'+argmax_pred+'</div>'
    $('#argmax_samples').prepend(argmax_pred_div);

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
});