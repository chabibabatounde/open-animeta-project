(function() {
'use strict';

/* ── ATTRIBUTES ──────────────────────────────────── */
var attrTbody = document.getElementById('attr-tbody');

function createAttrRow(name, type, constraint, min, max, domain) {
var tr = document.createElement('tr');

var fields = [
    { val: name || '', placeholder: 'e.g. speed' },
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
attrTbody.appendChild(createAttrRow('speed', 'float', '> 0', '0', '2.5', 'm/s'));
attrTbody.appendChild(createAttrRow('direction', 'float', 'discrete steps', '0', '360', 'degrees'));

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
refTbody.appendChild(createRefRow(
'Hanlon, R.T. & Messenger, J.B.',
'2018',
'Cuttlefish camouflage: The foraging behavior of Sepia officinalis',
'Cambridge University Press — Cephalopod Behaviour',
'10.1017/CBO9780511541962'
));

/* ── STATUS BAR ──────────────────────────────────── */
var statusLeft = document.getElementById('statusbar-left');

function updateStatus() {
var totalFields = 4; // name, category, species, description
var completed = 0;
if (document.getElementById('field-name').value.trim()) completed++;
if (document.getElementById('field-category').value) completed++;
if (document.getElementById('field-species').value.trim()) completed++;
if (document.getElementById('field-description').value.trim()) completed++;

var attrRows = attrTbody.querySelectorAll('tr').length;
totalFields += attrRows;

var refRows = refTbody.querySelectorAll('tr').length;

statusLeft.textContent = completed + ' / ' + (totalFields) + ' fields completed';
}

// Listen for input changes
['field-name','field-category','field-species','field-description'].forEach(function(id) {
document.getElementById(id).addEventListener('input', updateStatus);
document.getElementById(id).addEventListener('change', updateStatus);
});

updateStatus();

/* ── PREVIEW TAGS ────────────────────────────────── */
var previewTags = document.getElementById('preview-tags');

function updatePreview() {
var name = document.getElementById('field-name').value.trim();
var category = document.getElementById('field-category').value;
var species = document.getElementById('field-species').value.trim();

var html = '';

if (name) html += '<span class="tag">name: ' + name + '</span>';
if (category) {
    var label = category.replace(/-/g, ' ').replace(/\b\w/g, function(l){ return l.toUpperCase(); });
    html += '<span class="tag">category: ' + label + '</span>';
}
if (species) html += '<span class="tag">species: ' + species + '</span>';

if (!html) {
    html = '<span class="preview-empty">Fill in the form to see a summary of your action proposal here.</span>';
}

previewTags.innerHTML = html;
}

['field-name','field-category','field-species'].forEach(function(id) {
document.getElementById(id).addEventListener('input', updatePreview);
document.getElementById(id).addEventListener('change', updatePreview);
});

/* ── SUBMISSION ──────────────────────────────────── */
document.getElementById('btn-submit').addEventListener('click', function() {
document.getElementById('modal-overlay').classList.add('open');
});

document.getElementById('btn-modal-close').addEventListener('click', function() {
document.getElementById('modal-overlay').classList.remove('open');
});

document.getElementById('modal-overlay').addEventListener('click', function(e) {
if (e.target === this) {
    this.classList.remove('open');
}
});

document.getElementById('btn-save').addEventListener('click', function() {
var btn = this;
var orig = btn.textContent;
btn.textContent = 'Saved';
btn.style.color = '#059669';
btn.style.borderColor = '#059669';
setTimeout(function() {
    btn.textContent = orig;
    btn.style.color = '';
    btn.style.borderColor = '';
}, 1800);
});

})();