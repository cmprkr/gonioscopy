component.card.measurements.gonioscopy = function() {
  component.card.measurements.apply(this, arguments);
};
$.inherits(component.card.measurements.gonioscopy, component.card.measurements);

component.card.measurements.gonioscopy.prototype.get_card_id = function() {
  return this.get_card_row().card_id;
};

component.card.measurements.gonioscopy.prototype.get_filter = function() {
  const card = this.get_card_row();

  return {
    'measurement_panel_id': card.attributes.measurement_panel_id,
  };
};

component.card.measurements.gonioscopy.prototype.get_table = function() {
  return 'person_measurement';
};

component.card.measurements.gonioscopy.prototype.decorate_type_expand_header = function(parent, item) {
  this.decorate_triple_tile(parent, item);
};

component.card.measurements.gonioscopy.prototype.decorate_type_expand_center = function(parent, item) {
  this.decorate_image_(parent, item);
  this.decorate_other_findings_(parent, item);
};

component.card.measurements.gonioscopy.prototype.decorate_image_ = function(parent, item) {
  const self = this;
  const image_wrapper = $.createElement('div').style({
    'display': 'flex',
    'flex-wrap': 'wrap',
    'justify-content': 'center',
  });

  const canvas_settings = {
    'height': 400,
    'width': 800,
  };

  const rocket_canvas = $.createElement('canvas').style({
    'max-height': canvas_settings.height,
    'min-height': canvas_settings.height / 2,
    'max-width': canvas_settings.width,
    'min-width': canvas_settings.width / 2,
    'aspect-ratio': '2 / 1',
  });

  const canvas = rocket_canvas[0];
  const ctx = canvas.getContext('2d');

  canvas.width = canvas_settings.width;
  canvas.height = canvas_settings.height;

  const debounced_draw = $.debounce(20, function(c, c_settings) {
    const person_measurement = self.get(self.get_table(), item.person_measurement_id);
    const data = person_measurement.data[person_measurement.start];

    if (
      self.get_top_layer() instanceof layer.myhelo.view ||
      self.get_top_layer() instanceof layer.dictionary.view.measurement_panel_preview
    ) {
      self.draw_image_(item, c, c_settings);
    } else if (data.base64 !== undefined) {
      c.fillStyle = '#FFFFFF';
      c.fillRect(0, 0, c_settings.width, c_settings.height);

      // Draw the stored image.
      const img = new Image();

      img.onload = function() {
        c.drawImage(img, 0, 0, c_settings.width, c_settings.height);
      };

      img.src = data.base64;
    } else if (data.file_key !== undefined) {
      c.fillStyle = '#FFFFFF';
      c.fillRect(0, 0, c_settings.width, c_settings.height);

      // Draw the stored image.
      const img = new Image();

      img.onload = function() {
        c.drawImage(img, 0, 0, c_settings.width, c_settings.height);
      };

      img.src = component.file.get_source(data.file_key);
    }
  });

  // Should like debounce the image drawing.
  debounced_draw(ctx, canvas_settings);

  this.envoy.addEventListener('cache.update', function() {
    debounced_draw(ctx, canvas_settings);
  });

  const layer_ = this.get_top_layer();
  if (layer_ instanceof layer.myhelo.view) {
    layer_.pre_move_promise_ = function() {
      return new Promise((resolve, reject) => {
        component.loading.screen.make();

        const base64 = canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, '');
        const person_measurement = self.get(self.get_table(), item.person_measurement_id);
        const all_data = $.clone(person_measurement.data);
        const data = all_data[person_measurement.start];
        delete data.base64;

        // Upload the base64 image.
        api('clio', 'upload_base64', base64, function(response) {
          data.file_key = response.key;

          self.update('person_measurement', {
            'data': all_data,
            'person_measurement_id': item.person_measurement_id,
          });
          component.loading.screen.clear();
          resolve();
        });
      });
    };
  }

  image_wrapper.appendChild(rocket_canvas);
  parent.appendChild(image_wrapper);
};

component.card.measurements.gonioscopy.prototype.draw_image_ = function(item, ctx, canvas_settings) {
  const self = this;

  // Write an image to the canvas.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas_settings.width, canvas_settings.height);

  const svg_path = 'img/svg/gonio_eye.png';
  const img = new Image();

  img.onload = function() {
    for (const is_od of [true, false]) {
      const x_offset = is_od ? 0 : canvas_settings.width / 2;
      ctx.drawImage(img, x_offset, 0, canvas_settings.width / 2, canvas_settings.height);
      self.draw_text_(item, ctx, canvas_settings, is_od, x_offset);
    }

    setTimeout(function() {
      self.dispatchEvent('save_gonio_image');
    }, 0);
  };
  img.src = svg_path;
};

component.card.measurements.gonioscopy.prototype.draw_text_ = function(item, ctx, canvas_settings, is_od, x_offset) {
  const line_height = 15;
  const side_length = canvas_settings.width / 2;

  const draw_heading_text = function({context, text, x, y, size = 2, color = '#212121', thickness = 1, offset = 0}) {
    context.fillText(text, x, y);
  };

  const get_color_from_consise_obj = function(data, key) {
    let color = '#000000';
    let term_key = null;
    let term = null;
    let color_id = null;

    if (
      (data[key] !== undefined) &&
      ((term_key = data[key].measurement_normal_option_terminology_id) !== undefined) &&
      ((term = dictionary.terminology[term_key]) !== undefined) &&
      ((color_id = term.attributes.color_id) !== undefined) &&
      ((color = dictionary.color[color_id]) !== undefined)
    ) {
      return color.code;
    }

    return null;
  };

  const concise_obj = (new component.atlas.person_measurement(item.person_measurement_id))
    .get_output_object()
    .reduce((acc, val) => {
      acc[val.measurement_id] = val;
      return acc;
    }, {});

  const full_data = this.build_data_(concise_obj, is_od);
  const total_num_rows = 6;

  ctx.font = '300 20px Roboto';
  ctx.fillStyle = '#212121';

  draw_heading_text({
    'context': ctx,
    'text': 'Superior',
    'x': (side_length / 2) - (ctx.measureText('Superior').width / 2) + x_offset,
    'y': line_height * 2,
  });

  draw_heading_text({
    'context': ctx,
    'text': 'Inferior',
    'x': (side_length / 2) - (ctx.measureText('Inferior').width / 2) + x_offset,
    'y': side_length - (line_height),
  });

  draw_heading_text({
    'context': ctx,
    'text': is_od ? 'Temporal' : 'Nasal',
    'x': is_od ? x_offset : line_height + x_offset,
    'y': (side_length / 2) - (total_num_rows * line_height),
  });

  draw_heading_text({
    'context': ctx,
    'text': is_od ? 'Nasal' : 'Temporal',
    'x': is_od ? side_length - line_height - ctx.measureText('Nasal').width + x_offset :
    side_length - ctx.measureText('Temporal').width + x_offset,

    'y': (side_length / 2) - (total_num_rows * line_height),
  });

  draw_heading_text({
    'context': ctx,
    'text': 'Right eye (OD)',
    'x': 0,
    'y': line_height,
  });

  draw_heading_text({
    'context': ctx,
    'text': 'Left eye (OS)',
    'x': (side_length * 2) - ctx.measureText('Left eye (OS)').width,
    'y': line_height,
  });


  for (const key in full_data) {
    const set = full_data[key];
    let x = 0;
    let y = 0;
    for (const measurement in set) {
      ctx.font = '400 12px Roboto';
      ctx.fillStyle = '#212121';
      const text = ${set[measurement].text};
      const text_dimensions = ctx.measureText(text);

      switch (key) {
        case 'top':
          x = (side_length / 2) - (text_dimensions.width / 2) + x_offset;

          y = (line_height) + (line_height * (Object.keys(set).indexOf(measurement) + 2.5));
          break;
        case 'bottom':
          x = (side_length / 2) - (text_dimensions.width / 2) + x_offset;

          y = side_length - (line_height * (Object.keys(set).indexOf(measurement) + 2.75));
          break;
        case 'left':
          x = is_od ? x_offset : line_height + x_offset;
          y = (side_length / 2) - (total_num_rows * line_height) + (line_height * (Object.keys(set).indexOf(measurement) + 1.5));
          break;
        case 'right':
          x = is_od ? side_length - line_height - ctx.measureText(text).width + x_offset :
            side_length - ctx.measureText(text).width + x_offset - 15; // 15 because dots were off the edge.
          y = (side_length / 2) - (total_num_rows * line_height) + (line_height * (Object.keys(set).indexOf(measurement) + 1.5));
          break;
        default:
          break;
      }

      // ctx.fillStyle = get_color_from_consise_obj(concise_obj, set[measurement].measurement_id);
      // Draw background color under text.
      // ctx.fillStyle = '#ffffff';
      // ctx.fillRect(x - 2, y - line_height + 2, text_dimensions.width + 4, line_height + 2);
      ctx.fillText(text, x, y);

      let color = null;
      if ((color = get_color_from_consise_obj(concise_obj, set[measurement].measurement_id))) {
        // Draw a circle to the right of the text.
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x + text_dimensions.width + 10, y - (line_height / 4), 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.closePath();
      }
    }
  }
};


component.card.measurements.gonioscopy.prototype.build_data_ = function(concise_obj, is_od) {
  const get_answer = function(data, key) {
    // Multiple uses terminology dictionary.
    const answer = data[key];

    if (answer === undefined) {
      return {};
    }

    return {
      'text': answer.concise_value,
      'measurement_id': answer.measurement_id,
    };
  };

  // Don't judge me. Time is of the essence. (Whatever that means.)
  // Notes:
  // Order of measurements matter.
  // left and right are swapped between Nasal and Temporal.
  const full_data = {
    // Superior
    'top': {
      'AW': get_answer(concise_obj, is_od ? 69037 : 69044),
      'Pig': get_answer(concise_obj, is_od ? 69051 : 69058),
      'VS': get_answer(concise_obj, is_od ? 69065 : 69072),
      'IC': get_answer(concise_obj, is_od ? 69079 : 69086),
      'PAS': get_answer(concise_obj, is_od ? 69093 : 69100),
      'NV': get_answer(concise_obj, is_od ? 69114 : 69121),
    },
    // Nasal
    'right': {
      'AW': get_answer(concise_obj, is_od ? 69387 : 69310),
      'Pig': get_answer(concise_obj, is_od ? 69401 : 69324),
      'VS': get_answer(concise_obj, is_od ? 69415 : 69338),
      'IC': get_answer(concise_obj, is_od ? 69429 : 69352),
      'PAS': get_answer(concise_obj, is_od ? 69450 : 69366),
      'NV': get_answer(concise_obj, is_od ? 69464 : 69380),
    },
    // Inferior - Reversed to make printing easier >.>
    'bottom': {
      'NV': get_answer(concise_obj, is_od ? 69289 : 69296),
      'PAS': get_answer(concise_obj, is_od ? 69268 : 69275),
      'IC': get_answer(concise_obj, is_od ? 69254 : 69261),
      'VS': get_answer(concise_obj, is_od ? 69240 : 69247),
      'Pig': get_answer(concise_obj, is_od ? 69219 : 69226),
      'AW': get_answer(concise_obj, is_od ? 69205 : 69212),
    },
    // Temporal
    'left': {
      'AW': get_answer(concise_obj, is_od ? 69303 : 69394),
      'Pig': get_answer(concise_obj, is_od ? 69317 : 69408),
      'VS': get_answer(concise_obj, is_od ? 69331 : 69422),
      'IC': get_answer(concise_obj, is_od ? 69345 : 69443),
      'PAS': get_answer(concise_obj, is_od ? 69359 : 69457),
      'NV': get_answer(concise_obj, is_od ? 69373 : 69471),
    },
  };

  // Strip all the empty values.
  for (const key in full_data) {
    for (const measurement in full_data[key]) {
      if (Object.keys(full_data[key][measurement]).length === 0) {
        delete full_data[key][measurement];
      }
    }
  }

  return full_data;
};

component.card.measurements.gonioscopy.prototype.decorate_other_findings_ = function(parent, item) {
  const concise_obj = (new component.atlas.person_measurement(item.person_measurement_id))
    .get_output_object()
    .reduce((acc, val) => {
      acc[val.measurement_id] = val;
      return acc;
    }, {});

  const white_list = [
    34800, // right_eye_gonioscopy_other_findings
    46469, // os_gonioscopy_other_findings
  ];

  for (const white_list_key of white_list) {
    const consice_obj = concise_obj[white_list_key];
    if (
      consice_obj !== undefined &&
      consice_obj.name
    ) {
      parent.appendChild($.createElement('label')
        .innerText(consice_obj.name));

      parent.appendChild($.createElement('div').innerText(
        $.isArray(consice_obj.verbose_value) ?
          consice_obj.verbose_value.join(', ') :
          consice_obj.verbose_value));
    }
  }
};
