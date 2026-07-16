const json_actions = `
[   
    {
        "name": "Eat",
        "id": "Ax",
        "subtype": "Eat",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "GetCloser",
        "id": "Ax",
        "subtype": "GetCloser",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "Sleep",
        "id": "Ax",
        "subtype": "Sleep",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "RandomMove",
        "id": "Ax",
        "subtype": "RandomMove",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    },
    {
        "name": "RunAway",
        "id": "Ax",
        "subtype": "RunAway",
        "attributs": [
            {"name": "duration", "type": "int"},
            {"name": "gap", "type": "float"}
        ]
    }
]
`;


const actions = JSON.parse(json_actions);

// 🎯 Construire le propertiesSchema à partir du JSON
const actionsSchema = {};
let b = 0
actions.forEach(action => {
    b += 1;
    //const key = `Ax_${action.subtype}`; // clé unique : "Ax_Eat", "Ax_GetCloser", etc.
    const key = `Ax${b}`; // clé unique : "Ax_Eat", "Ax_GetCloser", etc.

    // Ajouter le champ action_type (readonly)
    const schema = [
        { 
            name: "action_type", 
            label: "Type d'action", 
            type: "select",  
            options: actions.map(a => a.subtype), 
            default: action.subtype, 
            readonly: true 
        }
    ];

    // Ajouter les attributs du JSON
    action.attributs.forEach(attr => {
        schema.push({
            name: attr.name,
            label: attr.name.charAt(0).toUpperCase() + attr.name.slice(1), // Capitalize
            type: attr.type === "int" ? "number" : "text",
            default: attr.type === "int" ? 0 : ""
        });
    });

    actionsSchema[key] = schema;
});

$(function() {

    /* ============ CONFIGURATION ============ */
    const connectionRules = {
        "PM": ["P", "D", "PT"],
        "P" : ["Px"],
        "Px": ["Sx"],
        "D": ["PD"],
        "PT": ["Ax", "PA"],
        "Sx": ["PK"],
        "PD": ["PT", "PK", "Px"],
        "PA": ["PK"]
    };

    const connectionLimits = {
        "PM": { "PT": 1, "D": 1, "P": 1 },
        "P": { "PM": 1 },
    };

    const incomingLimits = {
        "Sx": 1,
        "PD": 1,
        "D": 1,
        "Ax": 1,
        "PA": 1,
        "PK": 1,
        "PT": 1,
    };

    const propertiesSchema = {
        "PM": [{ name: "name", type: "text", default: "" }],
        "Px": [{ name: "name", type: "text", default: "" }, { name: "strength expression", type: "text", default: "" }],
        "PD": [{ name: "name", type: "text", default: "" }, { name: "test string", type: "text", default: "" }, { name: "description", type: "text", default: "" }],
        "Sx": [{ name: "target", type: "text", default: "" }, { name: "radius", type: "number", default: "" }, { name: "angle", type: "number", default: "" }, { name: "strength expression", type: "text", default: "" }, { name: "default", type: "text", default: "" }],
        "PA": [{ name: "name", type: "text", default: "" }],
        "PK": [{ name: "attribute", type: "text", default: "" }, { name: "type", type: "text", default: "float" }, { name: "range start point", type: "number", default: "0" }, { name: "range end point", type: "number", default: "10" }, { name: "values", type: "number", default: "" }],
        
        // 🎯 Ajouter tous les sous-types d'Ax
        ...actionsSchema
    };
    let b = 0;
    // 🎯 Afficher les actions dynamiquement dans le panel gauche
    actions.forEach(action => {
        b += 1;
        //const actionKey = `Ax_${action.subtype}`;
        const actionKey = `Ax${b}`;
        const code = `
            <div class="component-item" draggable="true" data-type="${actionKey}" data-subtype="${b}">
                <div class="icon-badge">Ax</div>
                <span>${action.name}</span>
            </div>
        `;
        document.getElementById('leftPanel').innerHTML += code;
    });

    /* ============ IMPORT JSON ============ */
    $('#btnImportJSON').on('click', function(e) {
        e.preventDefault();
        $('#fileImportInput').trigger('click');
    });

    $('#fileImportInput').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                loadGraphFromJSON(importedData);
            } catch (err) {
                log(`Erreur lors de l'import : fichier JSON invalide`, "error");
                showToast("Fichier JSON invalide", "error");
            }
        };
        reader.readAsText(file);
        $(this).val('');
    });

    function loadGraphFromJSON(importedData) {
        if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
            log("Structure JSON invalide : propriété 'nodes' manquante", "error");
            showToast("Structure JSON invalide", "error");
            return;
        }

        if (!confirm("Importer ce fichier remplacera le graphe actuel. Continuer ?")) {
            return;
        }

        clearCanvas(false);
        graphState = { nodes: {}, connections: [] };
        nodeCounter = 0;

        importedData.nodes.forEach(nodeData => {
            // 🎯 Vérifier avec le type complet (ex: "Ax_Eat")
            if (!propertiesSchema[nodeData.type]) {
                log(`Type de composant inconnu ignoré : "${nodeData.type}"`, "error");
                return;
            }

            graphState.nodes[nodeData.id] = {
                id: nodeData.id,
                type: nodeData.type,
                x: nodeData.x,
                y: nodeData.y,
                data: nodeData.data || {}
            };

            renderNode(graphState.nodes[nodeData.id]);

            const num = parseInt(nodeData.id.replace('node_', ''), 10);
            if (!isNaN(num) && num > nodeCounter) nodeCounter = num;
        });

        if (Array.isArray(importedData.connections)) {
            importedData.connections.forEach(conn => {
                if (graphState.nodes[conn.from] && graphState.nodes[conn.to]) {
                    graphState.connections.push({ from: conn.from, to: conn.to });
                }
            });
            redrawAllConnections();
        }

        $('#emptyHint').toggle(Object.keys(graphState.nodes).length === 0);
        log(`Graphe importé avec succès : <strong>${importedData.nodes.length}</strong> composant(s), <strong>${importedData.connections?.length || 0}</strong> connexion(s)`, "success");
        showToast("Import réussi", "success");
    }

    /* ============ EXPORT JSON ============ */
    function exportGraphToJSON() {
        const exportData = {
            meta: {
                appName: "GraphStudio",
                version: "1.0",
                exportedAt: new Date().toISOString(),
                nodeCount: Object.keys(graphState.nodes).length,
                connectionCount: graphState.connections.length
            },
            nodes: Object.values(graphState.nodes).map(node => ({
                id: node.id,
                type: node.type,
                x: node.x,
                y: node.y,
                data: node.data
            })),
            connections: graphState.connections.map(conn => ({
                from: conn.from,
                to: conn.to
            }))
        };
        return exportData;
    }

    $('#btnExportJSON').on('click', function(e) {
        e.preventDefault();

        if (Object.keys(graphState.nodes).length === 0) {
            showToast("Le graphe est vide, rien à exporter", "error");
            return;
        }
        verifyAndDisplayGraphDetails
        downloadGraphAsJSON();
    });

    function downloadGraphAsJSON() {
        const data = exportGraphToJSON();
        const jsonString = JSON.stringify(data, null, 2);

        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `Animeta-export-${timestamp}.anmt`;

        const $link = $('<a>')
            .attr('href', url)
            .attr('download', filename)
            .appendTo('body');

        $link[0].click();
        $link.remove();
        URL.revokeObjectURL(url);

        log(`Modèle : <strong>${filename}</strong> (${data.nodes.length} composant(s), ${data.connections.length} connexion(s))`, "success");
        showToast(`Export réussi : ${filename}`, "success");
    }

    /* ============ SUPPRESSION ============ */
    $(document).on('keydown', function(e) {
        const isTyping = $(e.target).is('input, textarea, select');
        if (isTyping) return;

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
            e.preventDefault();
            deleteNode(selectedNodeId);
        }
    });

    function deleteNode(nodeId) {
        const node = graphState.nodes[nodeId];
        if (!node) return;

        const label = node.data.name || node.type;

        if (!confirm(`Supprimer le composant "${label}" ?\nSes connexions seront également supprimées.`)) {
            return;
        }

        $('#' + nodeId).remove();

        const before = graphState.connections.length;
        graphState.connections = graphState.connections.filter(
            conn => conn.from !== nodeId && conn.to !== nodeId
        );
        const removedConnections = before - graphState.connections.length;

        delete graphState.nodes[nodeId];
        redrawAllConnections();

        if (selectedNodeId === nodeId) {
            selectNode(null);
        }

        if (Object.keys(graphState.nodes).length === 0) {
            $('#emptyHint').show();
        }

        log(`Composant "<strong>${label}</strong>" supprimé (${removedConnections} connexion(s) retirée(s))`, "success");
        showToast(`"${label}" supprimé`, "error");
    }

    let nodeCounter = 0;
    const graphState = { nodes: {}, connections: [] };
    let selectedNodeId = null;
    let linkModeSourceId = null;
    let zoomLevel = 1;

    /* ============ LOG CONSOLE ============ */
    function log(message, type = "info") {
        const time = new Date().toLocaleTimeString();
        const icons = { info: 'bi-info-circle', error: 'bi-x-circle', success: 'bi-check-circle' };
        const $line = $(`<div class="log-line log-${type}"></div>`);
        $line.append(`<span class="log-time">${time}</span>`);
        $line.append(`<i class="bi ${icons[type]} log-icon"></i>`);
        $line.append(`<span class="log-msg">${message}</span>`);
        $('#consoleLog').append($line);
        $('#consoleLog').scrollTop($('#consoleLog')[0].scrollHeight);
    }

    $('#clearConsole').on('click', function() {
        $('#consoleLog').empty();
        log("Console effacée.");
    });

    /* ============ RECHERCHE ============ */
    $('#componentSearch').on('input', function() {
        const query = $(this).val().toLowerCase();
        $('.component-item').each(function() {
            const text = $(this).text().toLowerCase();
            $(this).toggle(text.includes(query));
        });
    });

    /* ============ DRAG & DROP ============ */
    $('.component-item').on('dragstart', function(e) {
        e.originalEvent.dataTransfer.setData('componentType', $(this).data('type'));
        e.originalEvent.dataTransfer.setData('componentLabel', $(this).find('span').text());
        e.originalEvent.dataTransfer.setData('subtype', $(this).data('subtype') || '');
    });

    const $canvas = $('#graphCanvas');

    $canvas.on('dragover', function(e) { e.preventDefault(); });

    $canvas.on('drop', function(e) {
        e.preventDefault();
        const type = e.originalEvent.dataTransfer.getData('componentType');
        const label = e.originalEvent.dataTransfer.getData('componentLabel');
        const subtype = e.originalEvent.dataTransfer.getData('subtype');
        
        if (!type) return;

        const offset = $canvas.offset();
        const x = (e.originalEvent.pageX - offset.left + $canvas.scrollLeft()) / zoomLevel - 65;
        const y = (e.originalEvent.pageY - offset.top + $canvas.scrollTop()) / zoomLevel - 25;

        createNode(type, label, Math.max(0, x), Math.max(0, y));
    });

    function createNode(type, label, x, y) {
        const id = 'node_' + (++nodeCounter);
        $('#emptyHint').hide();

        const schema = propertiesSchema[type] || [];
        const defaultData = {};
        
        schema.forEach(field => defaultData[field.name] = field.default);
        defaultData.name = label;

        graphState.nodes[id] = { id, type, x, y, data: defaultData };
        renderNode(graphState.nodes[id]);
        log(`Composant "<strong>${label}</strong>" ajouté au graphe`, "success");
    }

    function renderNode(node) {
        const $node = $('<div class="graph-node"></div>')
            .attr('id', node.id)
            .attr('data-type', node.type)
            .css({ left: node.x + 'px', top: node.y + 'px' })
            .text(node.data.name || node.type);

        $canvas.append($node);

        $node.draggable({
            containment: "#graphCanvas",
            start: function() { $(this).css('z-index', 10); },
            drag: function() { redrawAllConnections(); },
            stop: function(e, ui) {
                node.x = ui.position.left;
                node.y = ui.position.top;
                $(this).css('z-index', 5);
                redrawAllConnections();
            }
        });

        $node.droppable({
            accept: '.graph-node',
            tolerance: 'pointer',
            over: function(e, ui) {
                if (ui.draggable.attr('id') !== node.id) $(this).addClass('drag-over');
            },
            out: function() { $(this).removeClass('drag-over'); }
        });

        $node.on('click', function(e) {
            e.stopPropagation();
            handleNodeClick(node.id);
        });
    }

    function handleNodeClick(nodeId) {
        if (linkModeSourceId && linkModeSourceId !== nodeId) {
            attemptConnection(linkModeSourceId, nodeId);
            $('#' + linkModeSourceId).removeClass('link-source');
            linkModeSourceId = null;
            return;
        }
        selectNode(nodeId);
    }

    $canvas.on('dblclick', '.graph-node', function(e) {
        e.stopPropagation();
        if (linkModeSourceId) $('#' + linkModeSourceId).removeClass('link-source');
        linkModeSourceId = $(this).attr('id');
        $(this).addClass('link-source');
        log(`Mode connexion activé depuis "<strong>${graphState.nodes[linkModeSourceId].data.name}</strong>". Cliquez sur la cible.`, "info");
    });

    function attemptConnection(fromId, toId) {
        const fromNode = graphState.nodes[fromId];
        const toNode = graphState.nodes[toId];

        // 🎯 Extraire le type générique (ex: "Ax" depuis "Ax_Eat")
        const fromGenericType = fromNode.type.split('_')[0];
        const toGenericType = toNode.type.split('_')[0];

        // --- Règle 1 : type autorisé ? ---
        const allowedTargets = connectionRules[fromGenericType] || [];
        if (!allowedTargets.includes(toGenericType)) {
            log(`Connexion refusée : "${fromGenericType}" → "${toGenericType}" non autorisé`, "error");
            showToast(`Règle invalide : ${fromGenericType} → ${toGenericType}`, "error");
            return;
        }

        // --- Règle 2 : connexion déjà existante ? ---
        const exists = graphState.connections.some(c => c.from === fromId && c.to === toId);
        if (exists) {
            log("Cette connexion existe déjà", "error");
            showToast("Connexion déjà existante", "error");
            return;
        }

        // --- Règle 3 : limite spécifique (source.type → cible.type) ---
        const limitsForSourceType = connectionLimits[fromGenericType];
        if (limitsForSourceType && limitsForSourceType[toGenericType] !== undefined) {
            const maxAllowed = limitsForSourceType[toGenericType];
            const currentCount = graphState.connections.filter(c => {
                const cFromGenericType = graphState.nodes[c.from].type.split('_')[0];
                const cToGenericType = graphState.nodes[c.to].type.split('_')[0];
                return c.from === fromId && cFromGenericType === fromGenericType && cToGenericType === toGenericType;
            }).length;

            if (currentCount >= maxAllowed) {
                const label = fromNode.data.name || fromGenericType;
                log(`Connexion refusée : "${label}" a déjà atteint sa limite de ${maxAllowed} connexion(s) vers "${toGenericType}"`, "error");
                showToast(`Limite atteinte : ${fromGenericType} → ${toGenericType} (max ${maxAllowed})`, "error");
                return;
            }
        }

        // --- Règle 4 : limite d'entrées globales pour le type cible ---
        const maxIncoming = incomingLimits[toGenericType];
        if (maxIncoming !== undefined) {
            const currentIncoming = graphState.connections.filter(c => c.to === toId).length;

            if (currentIncoming >= maxIncoming) {
                const label = toNode.data.name || toGenericType;
                log(`Connexion refusée : "${label}" a déjà atteint sa limite de ${maxIncoming} entrée(s)`, "error");
                showToast(`Limite atteinte : ${toGenericType} ne peut recevoir que ${maxIncoming} connexion(s)`, "error");
                return;
            }
        }

        // ✅ Toutes les règles passent
        graphState.connections.push({ from: fromId, to: toId });
        redrawAllConnections();
        log(`Connexion créée : <strong>${fromNode.data.name}</strong> → <strong>${toNode.data.name}</strong>`, "success");
    }

    function showToast(message, type) {
        const bgColor = type === 'error' ? '#f87171' : '#4ade80';
        const $toast = $(`<div style="position:fixed; top:70px; right:20px; background:${bgColor}; color:#fff; padding:12px 20px; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.3); z-index:9999; font-size:14px; font-weight:600;">${message}</div>`);
        $('body').append($toast);
        setTimeout(() => $toast.fadeOut(300, function() { $(this).remove(); }), 3000);
    }

    function redrawAllConnections() {
        const svg = document.getElementById('connectionsSvg');
        svg.querySelectorAll('line').forEach(l => l.remove());
        graphState.connections.forEach(conn => drawConnectionLine(conn.from, conn.to));
    }

    function drawConnectionLine(fromId, toId) {
        const $from = $('#' + fromId);
        const $to = $('#' + toId);
        if (!$from.length || !$to.length) return;

        const fromPos = $from.position();
        const toPos = $to.position();
        const x1 = fromPos.left + $from.outerWidth() / 2;
        const y1 = fromPos.top + $from.outerHeight() / 2;
        const x2 = toPos.left + $to.outerWidth() / 2;
        const y2 = toPos.top + $to.outerHeight() / 2;

        const svgNS = "http://www.w3.org/2000/svg";
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#7c5cff");
        line.setAttribute("stroke-width", "2.5");
        line.setAttribute("marker-end", "url(#arrowhead)");
        line.setAttribute("opacity", "0.85");
        document.getElementById('connectionsSvg').appendChild(line);
    }

    function initSvgDefs() {
        const svgNS = "http://www.w3.org/2000/svg";
        const defs = document.createElementNS(svgNS, "defs");
        defs.innerHTML = `<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#7c5cff"/></marker>`;
        document.getElementById('connectionsSvg').appendChild(defs);
    }
    initSvgDefs();

    $canvas.on('click', function() {
        selectNode(null);
        if (linkModeSourceId) $('#' + linkModeSourceId).removeClass('link-source');
        linkModeSourceId = null;
    });

    /* ============ PANNEAU DE DROITE ============ */
    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        $('.graph-node').removeClass('selected');

        if (!nodeId) {
            $('#noSelectionMsg').show();
            $('#propertiesForm').hide().empty();
            return;
        }

        $('#' + nodeId).addClass('selected');
        const node = graphState.nodes[nodeId];
        const schema = propertiesSchema[node.type] || [];

        $('#noSelectionMsg').hide();
        const $form = $('#propertiesForm').empty().show();

        $form.append(`
            <div class="node-header-badge">
                <div class="badge-icon">${node.type}</div>
                <div class="badge-text">
                    <strong>${node.data.name || node.type}</strong>
                    <small>ID: ${node.id}</small>
                </div>
            </div>
        `);

        schema.forEach(field => {
            const currentValue = node.data[field.name] !== undefined ? node.data[field.name] : field.default;
            let $inputGroup = $('<div class="form-group"></div>');
            
            const label = field.label || field.name;
            $inputGroup.append(`<label class="form-label">${label}</label>`);

            let $input;
            
            // 🎯 Champ readonly pour le subtype
            if (field.readonly) {
                $input = $(`<input type="text" class="form-control form-control-sm" readonly>`).val(currentValue);
            } else if (field.type === 'textarea') {
                $input = $(`<textarea class="form-control form-control-sm" rows="3"></textarea>`).val(currentValue);
            } else if (field.type === 'select') {
                $input = $('<select class="form-select form-select-sm"></select>');
                field.options.forEach(opt => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.text;
                    $input.append(`<option value="${optValue}" ${optValue === currentValue ? 'selected' : ''}>${optLabel}</option>`);
                });
            } else {
                $input = $(`<input type="${field.type}" class="form-control form-control-sm">`).val(currentValue);
            }

            $input.attr('data-field', field.name);
            if (field.readonly) $input.prop('disabled', true);
            
            $inputGroup.append($input);
            $form.append($inputGroup);
        });

        $form.append(`
            <div class="text-center mt-3" style="font-size: 12px; color: var(--text-secondary);">
                <i class="bi bi-keyboard"></i> Appuyez sur <kbd>Suppr</kbd> pour supprimer ce composant
            </div>
        `);

        $form.find('[data-field]').not('[readonly]').on('input change', function() {
            const fieldName = $(this).data('field');
            const value = $(this).val();
            node.data[fieldName] = value;

            if (fieldName === 'name') {
                $('#' + node.id).text(value);
                $('.node-header-badge strong').text(value);
                redrawAllConnections();
            }
            log(`Propriété "${fieldName}" mise à jour → "${value}"`);
        });
    }

    /* ============ ZOOM ============ */
    function applyZoom() {
        $('#graphCanvas').css('transform', `scale(${zoomLevel})`);
        $('#graphCanvas').css('transform-origin', '0 0');
    }
    
    $('#zoomIn').on('click', function() { zoomLevel = Math.min(2, zoomLevel + 0.1); applyZoom(); });
    $('#zoomOut').on('click', function() { zoomLevel = Math.max(0.5, zoomLevel - 0.1); applyZoom(); });
    $('#resetZoom').on('click', function() { zoomLevel = 1; applyZoom(); });

    /* ============ MENUS ============ */
    $('#btnClearGraph').on('click', function(e) {
        e.preventDefault();
        if (confirm("Voulez-vous vraiment effacer tout le graphe ?")) {
            graphState.nodes = {};
            graphState.connections = [];
            $canvas.find('.graph-node').remove();
            $('#connectionsSvg').find('line').remove();
            selectNode(null);
            $('#emptyHint').show();
            log("Graphe effacé", "info");
        }
    });

    function clearCanvas(askConfirmation = true) {
        if (askConfirmation && !confirm("Effacer le graphe ?")) return;
        
        graphState.nodes = {};
        graphState.connections = [];
        $canvas.find('.graph-node').remove();
        $('#connectionsSvg').find('line').remove();
        selectNode(null);
        $('#emptyHint').show();
    }

    $('#btnValidateGraph').on('click', function(e) {
        e.preventDefault();
        let errors = 0;

        graphState.connections.forEach(conn => {
            const fromGenericType = graphState.nodes[conn.from].type.split('_')[0];
            const toGenericType = graphState.nodes[conn.to].type.split('_')[0];
            
            if (!(connectionRules[fromGenericType] || []).includes(toGenericType)) {
                errors++;
                log(`Erreur : ${fromGenericType} → ${toGenericType} non autorisé`, "error");
            }
        });

        Object.keys(graphState.nodes).forEach(nodeId => {
            const node = graphState.nodes[nodeId];
            const nodeGenericType = node.type.split('_')[0];
            const limits = connectionLimits[nodeGenericType];
            
            if (!limits) return;

            Object.keys(limits).forEach(targetType => {
                const maxAllowed = limits[targetType];
                const count = graphState.connections.filter(c => {
                    const cToGenericType = graphState.nodes[c.to].type.split('_')[0];
                    return c.from === nodeId && cToGenericType === targetType;
                }).length;

                if (count > maxAllowed) {
                    errors++;
                    log(`Erreur : "${node.data.name || nodeGenericType}" a ${count} connexion(s) vers "${targetType}" (max ${maxAllowed})`, "error");
                }
            });
        });

        Object.keys(graphState.nodes).forEach(nodeId => {
            const node = graphState.nodes[nodeId];
            const nodeGenericType = node.type.split('_')[0];
            const maxIncoming = incomingLimits[nodeGenericType];
            
            if (maxIncoming === undefined) return;

            const count = graphState.connections.filter(c => c.to === nodeId).length;
            if (count > maxIncoming) {
                errors++;
                log(`Erreur : "${node.data.name || nodeGenericType}" a ${count} entrée(s) (max ${maxIncoming})`, "error");
            }
        });

        if (errors === 0) {
            log("✓ Validation réussie : toutes les connexions sont valides", "success");
            showToast("Validation réussie !", "success");
        } else {
            log(`Validation terminée avec ${errors} erreur(s)`, "error");
            showToast(`${errors} erreur(s) trouvée(s)`, "error");
        }
    });

    $('#btnAutoLayout').on('click', function(e) {
        e.preventDefault();
        log("Réorganisation automatique du graphe...", "info");
    });

    $('#btnSave').on('click', function() {
        const json = JSON.stringify(graphState, null, 2);
        console.log(json);
        log(`Graphe sauvegardé — ${Object.keys(graphState.nodes).length} nœuds, ${graphState.connections.length} connexions`, "success");
        showToast("Sauvegarde réussie !", "success");
    });

    $('#btnRunSimulation').on('click', function(e) {
        e.preventDefault();
        log("Simulation démarrée...", "info");
    });

    $('#btnOpenProject').on('click', function(e) { e.preventDefault(); alert("Cette fonctionnalité sera bientôt disponible.") });

    /* ============ RESPONSIVE TOGGLE ============ */
    $('#toggleLeftPanel').on('click', function() { $('#leftPanel').slideToggle(); });
    $('#toggleRightPanel').on('click', function() { $('#rightPanel').slideToggle(); });

    log("Application initialisée avec succès ✓");
    log("Glissez un composant depuis la gauche vers le canvas central");



$('#btnNewProject').on('click', function(e) {
    e.preventDefault();
    if(confirm("Voulez vous réellement créer un nouveau projet? toutes les données actuelles non sauvegardées seront perdues.")){
        location.reload();
    }
});
    /* ============ VÉRIFICATION DÉTAILLÉE DU GRAPHE ============ */
$('#btnVerify').on('click', function(e) {
    e.preventDefault();
    verifyAndDisplayGraphDetails();
});



/**
 * Récupère et affiche les détails complets de chaque nœud avec ses connexions et propriétés
 */
function verifyAndDisplayGraphDetails() {
    if (Object.keys(graphState.nodes).length === 0) {
        showToast("Le graphe est vide", "error");
        log("Graphe vide : aucun nœud à vérifier", "error");
        return;
    }
    const graphReport = {
        totalNodes: Object.keys(graphState.nodes).length,
        totalConnections: graphState.connections.length,
        nodes: []
    };

    let verifyErrors = [];

    // 🎯 Parcourir tous les nœuds
    Object.keys(graphState.nodes).forEach((nodeId, index) => {
        const node = graphState.nodes[nodeId];

        // Connexions entrantes (qui pointe vers ce nœud)
        const incomingConnections = graphState.connections.filter(c => c.to === nodeId);
        
        // Connexions sortantes (qui partent de ce nœud)
        const outgoingConnections = graphState.connections.filter(c => c.from === nodeId);

        // Détails du nœud
        const nodeDetails = {
            id: node.id,
            type: node.type,
            position: { x: node.x, y: node.y },
            properties: node.data,
            incomingConnections: incomingConnections.map(conn => ({
                from: conn.from,
                fromLabel: graphState.nodes[conn.from].data.name || graphState.nodes[conn.from].type,
                fromType: graphState.nodes[conn.from].type
            })),
            outgoingConnections: outgoingConnections.map(conn => ({
                to: conn.to,
                toLabel: graphState.nodes[conn.to].data.name || graphState.nodes[conn.to].type,
                toType: graphState.nodes[conn.to].type
            }))
        };
        let vNode = verifyNode(nodeDetails)
        if (vNode != -256){
            verifyErrors.push(vNode);
        }
    });
    if(verifyErrors.length == 0){
        showToast("Votre modèle est valide et peut être soumis pour traitement", "success");
        log("Votre modèle est valide et peut être soumis pour traitement", "success");
    }
    else{
        showToast(verifyErrors.length + " Erreurs détectée(s) dans votre modèle", "error");
        for (let index = 0; index < verifyErrors.length; index++) {
            const element = verifyErrors[index];
            log('\t'+element, "error");
        }
    }
}

});