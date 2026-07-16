function verifyNode(node){
    let result = -256;
    for (const propertie in node.properties) {
        if (node.properties.hasOwnProperty(propertie)) {
            const value = node.properties[propertie];
            switch (propertie) {
                case 'target':
                    if(value==''){
                        result = 'Target non défini pour '+node.type;
                    }
                    break;
                
                case 'name':
                    if(value==''){
                        result = 'Veuillez donner un nom à '+node.type;
                    }
                    break;

                case 'test string':
                    if(value==''){
                        result = 'Test string ne peut pas être vide pour '+node.type;
                    }
                    break;

                case 'attribute':
                    if(value==''){
                        result = 'Vous devez définir un attribut pour tous les '+node.type;
                    }
                    break;
                
                case 'strength expression':
                    if(value==''){
                        result = 'Strength expression ne peut pas être vide pour '+node.type;
                    }
                    break;
                
                case 'type':
                    if (!['float', 'int'].includes(value)) {
                        result = "Le type " + value + " du paramètre pour " + node.type + " n'est pas accepté";
                    }
                    break;
                
                case 'angle':
                    if(value==''){
                        result = "Vous devez définir une valeur de l'angle pour "+node.type;
                    }
                    break;

                case 'raduis':
                    if(value==''){
                        result = "Vous devez définir un rayon pour "+node.type;
                    }
                    break;

                case 'default':
                    if(value==''){
                        result = "Définissez une valeur par défaut pour "+node.type;
                    }
                    break;
                    
                default:
                    // Code par défaut si aucun cas ne correspond
            }
            if(result == -256){
                /*
                if(node.type =='Sx'){
                    if (!['float', 'int'].includes(value)) {
                        result = "Le type " + value + " du paramètre pour " + node.type + " n'est pas accepté";
                    }
                }*/
            }
        }
    }
    return result
}