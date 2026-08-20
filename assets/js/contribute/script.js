(function() {
'use strict';

/* ── ATTRIBUTES ──────────────────────────────────── */
var attrTbody = document.getElementById('attr-tbody');

function createAttrRow(name, type, constraint, min, max, domain) {
  var tr = document.createElement('tr');

  var fields = [
    { val: name || '', placeholder: 'e.g. duration' },
    { val: type || '', placeholder: 'float' },
    { val: constraint || '', placeholder: 'e.g. > 0' },
    { val: min || '', placeholder: '0' },
    { val: max || '', placeholder: '1.0' },
    { val: domain || '', placeholder: 'm/s' }
  ];
  var cols = ['col-name','col-type','col-constraint','col-min','col-max','col-domain'];

  fields.forEach(function(f, i) {
    var td = document.createElement('td');
    td.className = cols[i];
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = f.placeholder;
    inp.value = f.val;
    td.appendChild(inp);
    tr.appendChild(td);
  });

  var tdDel = document.createElement('td');
  tdDel.className = 'col-action';
  var btn = document.createElement('button');
  btn.className = 'btn-remove-row';
  btn.type = 'button';
  btn.innerHTML = '&#x2715;';
  btn.title = 'Remove row';
  btn.addEventListener('click', function() {
    tr.parentNode.removeChild(tr);
    updateStatus();
  });
  tdDel.appendChild(btn);
  tr.appendChild(tdDel);

  return tr;
}

document.getElementById('btn-add-attr').addEventListener('click', function() {
  attrTbody.appendChild(createAttrRow());
  updateStatus();
});

// Seed rows
attrTbody.appendChild(createAttrRow());
attrTbody.appendChild(createAttrRow());

/* ── REFERENCES ───────────────────────────────────── */
var refTbody = document.getElementById('ref-tbody');

function createRefRow(authors, year, title, source, doi) {
  var tr = document.createElement('tr');

  var fields = [
    { val: authors || '', placeholder: 'e.g. Anderson & Altmann' },
    { val: year || '', placeholder: 'e.g. 1971' },
    { val: title || '', placeholder: 'e.g. Foraging behavior in Cuttlefish' },
    { val: source || '', placeholder: 'e.g. Animal Behaviour' },
    { val: doi || '', placeholder: 'DOI or URL' }
  ];
  var cols = ['col-authors','col-year','col-title','col-source','col-doi'];

  fields.forEach(function(f, i) {
    var td = document.createElement('td');
    td.className = cols[i];
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = f.placeholder;
    inp.value = f.val;
    td.appendChild(inp);
    tr.appendChild(td);
  });

  var tdDel = document.createElement('td');
  tdDel.className = 'col-action';
  var btn = document.createElement('button');
  btn.className = 'btn-remove-row';
  btn.type = 'button';
  btn.innerHTML = '&#x2715;';
  btn.title = 'Remove row';
  btn.addEventListener('click', function() {
    tr.parentNode.removeChild(tr);
    updateStatus();
  });
  tdDel.appendChild(btn);
  tr.appendChild(tdDel);

  return tr;
}

document.getElementById('btn-add-ref').addEventListener('click', function() {
  refTbody.appendChild(createRefRow());
  updateStatus();
});

// Seed row
refTbody.appendChild(createRefRow());

/* ── STATUS BAR ──────────────────────────────────── */
var statusLeft = document.getElementById('statusbar-left');

function updateStatus() {
  var totalFields = 2; // name, description
  var completed = 0;
  if (document.getElementById('field-name').value.trim()) completed++;
  if (document.getElementById('field-description').value.trim()) completed++;

  var attrRows = attrTbody.querySelectorAll('tr').length;
  totalFields += attrRows;

  //statusLeft.textContent = completed + ' / ' + totalFields + ' fields completed';
}

['field-name','field-description'].forEach(function(id) {
  var el = document.getElementById(id);
  el.addEventListener('input', updateStatus);
  el.addEventListener('change', updateStatus);
});

updateStatus();

/* ── COLLECTE DES DONNÉES DU FORMULAIRE ──────────── */
function collectAttributes() {
  var rows = attrTbody.querySelectorAll('tr');
  var attributes = [];

  rows.forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var name = inputs[0].value.trim();
    var type = inputs[1].value.trim();
    var constraint = inputs[2].value.trim();
    var min = inputs[3].value.trim();
    var max = inputs[4].value.trim();
    var domain = inputs[5].value.trim();

    // On ignore les lignes complètement vides
    if (name || type || constraint || min || max || domain) {
      attributes.push({
        name: name,
        type: type,
        constraint: constraint,
        min: min !== '' ? min : null,
        max: max !== '' ? max : null,
        domain: domain
      });
    }
  });

  return attributes;
}

function collectReferences() {
  var rows = refTbody.querySelectorAll('tr');
  var references = [];

  rows.forEach(function(row) {
    var inputs = row.querySelectorAll('input');
    var authors = inputs[0].value.trim();
    var year = inputs[1].value.trim();
    var title = inputs[2].value.trim();
    var source = inputs[3].value.trim();
    var doi = inputs[4].value.trim();

    if (authors || year || title || source || doi) {
      references.push({
        authors: authors,
        year: year !== '' ? parseInt(year, 10) : null,
        title: title,
        source: source,
        doi: doi
      });
    }
  });

  return references;
}

function collectFormData() {
  return {
    name: document.getElementById('field-name').value.trim(),
    description: document.getElementById('field-description').value.trim(),
    implementation: {
      language: document.getElementById('field-language').value,
      code: document.getElementById('field-code').value.trim()
    },
    attributes: collectAttributes(),
    references: collectReferences(),
    submitted_at: new Date().toISOString()
  };
}

/* ── VALIDATION MINIMALE ──────────────────────────── */
function validateFormData(data) {
    var errors = [];

    if (!data.name) {
        errors.push('Action name is required.');
    }
    if (!data.description) {
        errors.push('Description is required.');
    }
    return errors;
}

/* ── ENVOI VERS L'API ─────────────────────────────── */
var API_URL = '/contribute'; // ← à adapter
function resetForm() {
  // Reset simple fields
  document.getElementById('field-name').value = '';
  document.getElementById('field-description').value = '';
  document.getElementById('field-language').value = 'pseudocode';
  document.getElementById('field-code').value = '';

  // Reset the attributes table (clear everything and add back 2 empty rows)
  var attrTbody = document.getElementById('attr-tbody');
  attrTbody.innerHTML = '';
  attrTbody.appendChild(createAttrRow());
  attrTbody.appendChild(createAttrRow());

  // Reset the references table (clear everything and add back 1 empty row)
  var refTbody = document.getElementById('ref-tbody');
  refTbody.innerHTML = '';
  refTbody.appendChild(createRefRow());

  // Update the status bar if it exists
  if (typeof updateStatus === 'function') {
    updateStatus();
  }
}

async function submitForm(data) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Success:', result);

    // ── Success: alert + form reset ──
    alert('✅ Your proposal has been submitted successfully!');
    resetForm();

    return result;

  } catch (error) {
    console.error('Submission failed:', error);

    // ── Failure: error alert ──
    alert('❌ Submission failed: ' + error.message);

    throw error;
  }
}

/* ── SUBMISSION HANDLER ──────────────────────────── */
document.getElementById('btn-submit').addEventListener('click', function(e) {
    e.preventDefault();

    var formData = collectFormData();
    var errors = validateFormData(formData);

    if (errors.length > 0) {
    alert('Please fix the following errors:\n\n- ' + errors.join('\n- '));
    return;
    }

    submitForm(formData);
});

document.getElementById('btn-modal-close').addEventListener('click', function() {
    document.getElementById('modal-overlay').classList.remove('open');
});

document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('open');
    }
});

})();