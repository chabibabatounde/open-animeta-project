
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
        "PA": ['PK']
    };

    const connectionLimits = {
        // PM ne peut avoir qu'1 seule connexion vers PT , D, et P
        "PM": { "PT": 1, "D": 1, "P": 1 },
        "P": { "PM": 1 },
    };

    const incomingLimits = {
        "Sx": 1,   // Sx ne peut recevoir que 1 connexion entrantes max
        "PD": 1,
        "D": 1,
        "Ax": 1,
        "PA": 1,
        "PK": 1,
        "PT": 1,
    };



    const propertiesSchema = {
        "PM": [{ name: "label", type: "text", default: "" }, { name: "value", type: "number", default: 0 }, { name: "partialAction", type: "number", default: 0 }],
        "B": [{ name: "label", type: "text", default: "" }, { name: "description", type: "textarea", default: "" }],
        "C": [{ name: "label", type: "text", default: "" }],
        "D": [{ name: "label", type: "text", default: "" }, { name: "options", type: "select", options: ["Option1","Option2","Option3"], default: "Option1" }],
        "E": [{ name: "label", type: "text", default: "" }],
        "F": [{ name: "label", type: "text", default: "" }],
        "G": [{ name: "label", type: "text", default: "" }],
        "H": [{ name: "label", type: "text", default: "" }, { name: "finalValue", type: "number", default: 0 }]
    };


    
    /* ==========================================================
    IMPORT D'UN GRAPHE DEPUIS UN FICHIER JSON
   ========================================================== */
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
    $(this).val(''); // reset l'input pour pouvoir réimporter le même fichier plus tard
});

/**
 * Recharge entièrement le graphe à partir d'un objet JSON importé
 */
function loadGraphFromJSON(importedData) {
    // Validation minimale de la structure attendue
    if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
        log("Structure JSON invalide : propriété 'nodes' manquante", "error");
        showToast("Structure JSON invalide", "error");
        return;
    }

    if (!confirm("Importer ce fichier remplacera le graphe actuel. Continuer ?")) {
        return;
    }

    // 1. On vide le canvas actuel
    clearCanvas(false); // false = ne pas redemander de confirmation ici

    // 2. On reconstruit le state à partir des données importées
    graphState = { nodes: {}, connections: [] };
    nodeCounter = 0;

    importedData.nodes.forEach(nodeData => {
        // Vérifie que le type existe toujours dans le catalogue actuel
        if (!componentCatalog[nodeData.type]) {
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

        renderNode(nodeData.id);

        // Met à jour le compteur pour éviter les collisions d'ID futurs
        const num = parseInt(nodeData.id.replace('node_', ''), 10);
        if (!isNaN(num) && num > nodeCounter) nodeCounter = num;
    });

    // 3. Recréation des connexions
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

    /* ==========================================================
    EXPORT DU GRAPHE EN JSON
    ========================================================== */
function exportGraphToJSON() {
    // On construit un objet propre, sérialisable, indépendant du DOM
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

    downloadGraphAsJSON();
});

/**
 * Déclenche le téléchargement du fichier JSON dans le navigateur
 */
function downloadGraphAsJSON() {
    const data = exportGraphToJSON();
    const jsonString = JSON.stringify(data, null, 2); // indentation = 2 espaces, lisible

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `graphstudio-export-${timestamp}.json`;

    const $link = $('<a>')
        .attr('href', url)
        .attr('download', filename)
        .appendTo('body');

    $link[0].click();
    $link.remove();
    URL.revokeObjectURL(url);

    log(`Graphe exporté : <strong>${filename}</strong> (${data.nodes.length} composant(s), ${data.connections.length} connexion(s))`, "success");
    showToast(`Export réussi : ${filename}`, "success");
}



    /* ============ SUPPRESSION VIA TOUCHE "SUPPR" ============ */
    $(document).on('keydown', function(e) {
        // Ne pas déclencher si l'utilisateur est en train de taper dans un champ
        const isTyping = $(e.target).is('input, textarea, select');
        if (isTyping) return;

        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
            e.preventDefault();
            deleteNode(selectedNodeId);
        }
    });

/**
 * Supprime un nœud du graphe :
 * - Retire l'élément du DOM
 * - Retire ses données du state
 * - Retire toutes les connexions liées (entrantes et sortantes)
 * - Vide le panneau de droite si c'était le nœud sélectionné
 */
function deleteNode(nodeId) {
    const node = graphState.nodes[nodeId];
    if (!node) return;

    const label = node.data.label || node.type;

    if (!confirm(`Supprimer le composant "${label}" ?\nSes connexions seront également supprimées.`)) {
        return;
    }

    // Suppression du DOM
    $('#' + nodeId).remove();

    // Suppression des connexions liées (source ou cible)
    const before = graphState.connections.length;
    graphState.connections = graphState.connections.filter(
        conn => conn.from !== nodeId && conn.to !== nodeId
    );
    const removedConnections = before - graphState.connections.length;

    // Suppression des données du nœud
    delete graphState.nodes[nodeId];

    // Redessiner les connexions restantes
    redrawAllConnections();

    // Vider le panneau de droite si nécessaire
    if (selectedNodeId === nodeId) {
        selectNode(null);
    }

    // Réafficher le message d'aide si le canvas est vide
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

    /* ============ RECHERCHE DE COMPOSANTS ============ */
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
    });

    const $canvas = $('#graphCanvas');

    $canvas.on('dragover', function(e) { e.preventDefault(); });

    $canvas.on('drop', function(e) {
        e.preventDefault();
        const type = e.originalEvent.dataTransfer.getData('componentType');
        const label = e.originalEvent.dataTransfer.getData('componentLabel');
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
        if (defaultData.hasOwnProperty('label') && !defaultData.label) defaultData.label = label;

        graphState.nodes[id] = { id, type, x, y, data: defaultData };
        renderNode(graphState.nodes[id]);
        log(`Composant "<strong>${label}</strong>" ajouté au graphe`, "success");
    }

    function renderNode(node) {
        const $node = $('<div class="graph-node"></div>')
            .attr('id', node.id)
            .attr('data-type', node.type)
            .css({ left: node.x + 'px', top: node.y + 'px' })
            .text(node.data.label || node.type);

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
        log(`Mode connexion activé depuis "<strong>${graphState.nodes[linkModeSourceId].data.label}</strong>". Cliquez sur la cible.`, "info");
    });

    function attemptConnection(fromId, toId) {
    const fromNode = graphState.nodes[fromId];
    const toNode = graphState.nodes[toId];

    // --- Règle 1 : type autorisé ? (existant) ---
    const allowedTargets = connectionRules[fromNode.type] || [];
    if (!allowedTargets.includes(toNode.type)) {
        log(`Connexion refusée : "${fromNode.type}" → "${toNode.type}" non autorisé`, "error");
        showToast(`Règle invalide : ${fromNode.type} → ${toNode.type}`, "error");
        return;
    }

    // --- Règle 2 : connexion déjà existante ? (existant) ---
    const exists = graphState.connections.some(c => c.from === fromId && c.to === toId);
    if (exists) {
        log("Cette connexion existe déjà", "error");
        showToast("Connexion déjà existante", "error");
        return;
    }

    // --- Règle 3 : limite spécifique (source.type → cible.type) ---
    const limitsForSourceType = connectionLimits[fromNode.type];
    if (limitsForSourceType && limitsForSourceType[toNode.type] !== undefined) {
        const maxAllowed = limitsForSourceType[toNode.type];

        const currentCount = graphState.connections.filter(c => {
            const cFromType = graphState.nodes[c.from].type;
            const cToType = graphState.nodes[c.to].type;
            return c.from === fromId && cFromType === fromNode.type && cToType === toNode.type;
        }).length;

        if (currentCount >= maxAllowed) {
            const label = fromNode.data.label || fromNode.type;
            log(`Connexion refusée : "${label}" a déjà atteint sa limite de ${maxAllowed} connexion(s) vers "${toNode.type}"`, "error");
            showToast(`Limite atteinte : ${fromNode.type} → ${toNode.type} (max ${maxAllowed})`, "error");
            return;
        }
    }

    // --- Règle 4 : limite d'entrées globales pour le type cible ---
    const maxIncoming = incomingLimits[toNode.type];
    if (maxIncoming !== undefined) {
        const currentIncoming = graphState.connections.filter(c => c.to === toId).length;

        if (currentIncoming >= maxIncoming) {
            const label = toNode.data.label || toNode.type;
            log(`Connexion refusée : "${label}" a déjà atteint sa limite de ${maxIncoming} entrée(s)`, "error");
            showToast(`Limite atteinte : ${toNode.type} ne peut recevoir que ${maxIncoming} connexion(s)`, "error");
            return;
        }
    }

    // ✅ Toutes les règles passent → on crée la connexion
    graphState.connections.push({ from: fromId, to: toId });
    redrawAllConnections();
    log(`Connexion créée : <strong>${fromNode.data.label}</strong> → <strong>${toNode.data.label}</strong>`, "success");
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
                    <strong>${node.data.label || node.type}</strong>
                    <small>ID: ${node.id}</small>
                </div>
            </div>
        `);

        schema.forEach(field => {
            const currentValue = node.data[field.name] !== undefined ? node.data[field.name] : field.default;
            let $inputGroup = $('<div class="form-group"></div>');
            $inputGroup.append(`<label class="form-label">${field.name}</label>`);

            let $input;
            if (field.type === 'textarea') {
                $input = $(`<textarea class="form-control form-control-sm" rows="3"></textarea>`).val(currentValue);
            } else if (field.type === 'select') {
                $input = $('<select class="form-select form-select-sm"></select>');
                field.options.forEach(opt => {
                    $input.append(`<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`);
                });
            } else {
                $input = $(`<input type="${field.type}" class="form-control form-control-sm">`).val(currentValue);
            }

            $input.attr('data-field', field.name);
            $inputGroup.append($input);
            $form.append($inputGroup);
        });

        $form.append(`
    <div class="text-center mt-3" style="font-size: 12px; color: var(--text-secondary);">
        <i class="bi bi-keyboard"></i> Appuyez sur <kbd>Suppr</kbd> pour supprimer ce composant
    </div>
`);

        $form.find('[data-field]').on('input change', function() {
            const fieldName = $(this).data('field');
            const value = $(this).val();
            node.data[fieldName] = value;

            if (fieldName === 'label') {
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

    $('#btnValidateGraph').on('click', function(e) {
    e.preventDefault();
    let errors = 0;

    // Vérif type autorisé (existant)
    graphState.connections.forEach(conn => {
        const fromType = graphState.nodes[conn.from].type;
        const toType = graphState.nodes[conn.to].type;
        if (!(connectionRules[fromType] || []).includes(toType)) {
            errors++;
            log(`Erreur : ${fromType} → ${toType} non autorisé`, "error");
        }
    });

    // 🎯 NOUVEAU : vérif des limites source → cible
    Object.keys(graphState.nodes).forEach(nodeId => {
        const node = graphState.nodes[nodeId];
        const limits = connectionLimits[node.type];
        if (!limits) return;

        Object.keys(limits).forEach(targetType => {
            const maxAllowed = limits[targetType];
            const count = graphState.connections.filter(c => {
                return c.from === nodeId && graphState.nodes[c.to].type === targetType;
            }).length;

            if (count > maxAllowed) {
                errors++;
                log(`Erreur : "${node.data.label || node.type}" a ${count} connexion(s) vers "${targetType}" (max ${maxAllowed})`, "error");
            }
        });
    });

    // 🎯 NOUVEAU : vérif des limites d'entrées
    Object.keys(graphState.nodes).forEach(nodeId => {
        const node = graphState.nodes[nodeId];
        const maxIncoming = incomingLimits[node.type];
        if (maxIncoming === undefined) return;

        const count = graphState.connections.filter(c => c.to === nodeId).length;
        if (count > maxIncoming) {
            errors++;
            log(`Erreur : "${node.data.label || node.type}" a ${count} entrée(s) (max ${maxIncoming})`, "error");
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
        // Placeholder pour un futur algorithme de layout automatique
    });

    $('#btnSave').on('click', function() {
        const json = JSON.stringify(graphState, null, 2);
        console.log(json);
        log(`Graphe sauvegardé — ${Object.keys(graphState.nodes).length} noeuds, ${graphState.connections.length} connexions`, "success");
        showToast("Sauvegarde réussie !", "success");
    });

    $('#btnRunSimulation').on('click', function(e) {
        e.preventDefault();
        log("Simulation démarrée...", "info");
    });

    $('#btnNewProject').on('click', function(e) { e.preventDefault(); log("Nouveau projet créé"); });
    $('#btnOpenProject').on('click', function(e) { e.preventDefault(); log("Ouverture d'un projet..."); });

    /* ============ RESPONSIVE TOGGLE ============ */
    $('#toggleLeftPanel').on('click', function() { $('#leftPanel').slideToggle(); });
    $('#toggleRightPanel').on('click', function() { $('#rightPanel').slideToggle(); });

    log("Application initialisée avec succès ✓");
    log("Glissez un composant depuis la gauche vers le canvas central");

});