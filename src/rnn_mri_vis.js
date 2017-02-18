
var WeightsComponent = function (options) {

  this.pixelSize = options.pixelSize || 10;
  this.positiveActivationHue = options.positiveActivationHue || 190;
  this.negativeActivationHue = options.negativeActivationHue || 6;
  this.positiveActivationSaturation = options.positiveActivationSaturation || 100;
  this.negativeActivationSaturation = options.negativeActivationSaturation || 70;
  this.fullActivationBrightness = options.fullActivationBrightness || 70;

  this.showDiffs = options.showDiffs || false;
  this.diffTrackDecayRate = options.diffTrackDecayRate || 0.95;
  this.diffTrackSensitivity = options.diffTrackSensitivity || 100.0;

  this.parentElement = options.parentElement;

  this.setNewModel(options.model);
}

WeightsComponent.prototype = {
  setNewModel: function (model) {
    var self = this;
    self.model = model;

    if (self.keys) {
      self.keys.forEach(function (key) {
        self.canvases[key].remove();
        self.diffTrackingMats[key] = undefined;
        self.oldMats[key] = undefined;
      });
    }

    self.canvases = {};
    self.diffTrackingMats = {};
    self.oldMats = {};
    self.keys = Object.keys(self.model);

    self.keys.forEach(function (key) {
      var mat = self.model[key];
      self.diffTrackingMats[key] = new R.Mat(mat.n, mat.d);
      self.oldMats[key] = new R.Mat(mat.n, mat.d);

      var rowCount = mat.n;
      var colCount = mat.d;

      var canvas = document.createElement('canvas');
      canvas.height = rowCount * self.pixelSize;
      canvas.width = colCount * self.pixelSize;

      self.parentElement.append(canvas);

      self.canvases[key] = canvas;
    });
    this.render();
  },
  render: function () {
    var self = this;
    this.keys.forEach(function (key) {
      var mat = self.model[key];
      var oldMat = self.oldMats[key];
      var ctx = self.canvases[key].getContext('2d');

      var minmaxWeightIndices = R.minmaxi(mat.w);
      var minWeight = mat.w[minmaxWeightIndices[0]];
      var maxWeight = mat.w[minmaxWeightIndices[1]];

      var weightDiffMat, maxWeightDiff;
      var G = new R.Graph(false);
      weightDiffMat = G.sub(oldMat, mat);
      weightDiffMat = G.eltmul(weightDiffMat, weightDiffMat);

      self.diffTrackingMats[key] = G.add(weightDiffMat, self.diffTrackingMats[key]);

      var maxWeightDiffIndex = R.maxi(weightDiffMat.w);
      maxWeightDiff = Math.max(weightDiffMat.w[maxWeightDiffIndex], self.diffTrackSensitivity);

      for (var row = 0; row < mat.n; row++) {
        for (var col = 0; col < mat.d; col++) {
          var weight = mat.get(row, col);

          ctx.fillStyle = self.getActivationColor(minWeight, maxWeight, weight);
          ctx.fillRect(col * self.pixelSize, row * self.pixelSize, self.pixelSize, self.pixelSize);

          if (self.showDiffs) {
            var weightDiff = self.diffTrackingMats[key].get(row, col);

            ctx.fillStyle = self.getFocusColor(0, maxWeightDiff, weightDiff);
            ctx.fillRect(col * self.pixelSize, row * self.pixelSize, self.pixelSize, self.pixelSize);
          }
        }
      }

      for (var i = 0; i < self.diffTrackingMats[key].w.length; i++) {
        self.diffTrackingMats[key].w[i] *= self.diffTrackDecayRate;
      }

      self.oldMats[key] = mat.clone();
    });
  },
  getActivationColor: function (min, max, value) {
    var hue, saturation, lightness;
    if (value < 0) {
      hue = this.negativeActivationHue;
      saturation = this.negativeActivationSaturation;
    } else {
      hue = this.positiveActivationHue;
      saturation = this.negativeActivationSaturation;
    }

    if (min * max > 0) {
      // signs are the same.
      lightness = this.fullActivationBrightness * (max - value) / (max - min);
    } else {
      // signs differ: min is negative and max is positive.
      var maxDisplacement = max > -1 * min ? max : -1 * min;
      var absoluteValue = value > 0 ? value : -1 * value;
      lightness = this.fullActivationBrightness * absoluteValue / maxDisplacement;
    }

    // round to nearest tenth
    lightness = Math.round(lightness * 10) / 10;

    return 'hsl(' + hue + ',' + saturation + '%,' + lightness + '%)';
  },
  getFocusColor: function (min, max, value) {
    var fraction = (value - min) / (max - min);

    // round to nearest tenth
    var alphaVal = Math.round(2550 * fraction) / 10;
    return 'rgba(255,255,255,' + alphaVal + ')';
  }
}
