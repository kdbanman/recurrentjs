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

  $('#reinitialize_weights').click(function () {
    stopLearning();
    reinit();
  });
  $('#train_once').click(function () {
    tick();
  });
  $('#pause_training').click(function () {
    stopLearning();
  });
  $("#train_continuously").click(function () {
    startLearning();
  });

  $("#sample_network").click(function () {
    var shouldRestart = isLearning();
    stopLearning();

    $('#samples .apred').last().remove();
    var pred = sampleNetwork();
    var pred_div = '<div class="apred">'+pred+'</div>'
    $('#samples').prepend(pred_div);

    $('#argmax .apred').last().remove();
    var argmax_pred = sampleNetworkGreedy();
    var argmax_pred_div = '<div class="apred">'+argmax_pred+'</div>'
    $('#argmax').prepend(argmax_pred_div);

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
      sample_softmax_temperature = Math.pow(10, ui.value);
      $("#temperature_text").text( sample_softmax_temperature.toFixed(2) );
    }
  });

  // MAIN ENTRY POINT
  // Initialize the network
  reinit();
});
