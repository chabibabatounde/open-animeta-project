function verifyNode(node){
    let result = -256;
    for (const propertie in node.properties) {
        if (node.properties.hasOwnProperty(propertie)) {
            const value = node.properties[propertie];
            switch (propertie) {
                case 'target':
                    if(value==''){
                        result = 'Target is not defined for '+node.type;
                    }
                    break;

                case 'name':
                    if(value==''){
                        result = 'Please give a name to '+node.type;
                    }
                    break;

                case 'test string':
                    if(value==''){
                        result = 'Test string cannot be empty for '+node.type;
                    }
                    break;

                case 'attribute':
                    if(value==''){
                        result = 'You must define an attribute for all '+node.type;
                    }
                    break;

                case 'strength expression':
                    if(value==''){
                        result = 'Strength expression cannot be empty for '+node.type;
                    }
                    break;

                case 'type':
                    if (!['float', 'int'].includes(value)) {
                        result = "The type " + value + " of the parameter for " + node.type + " is not accepted";
                    }
                    break;

                case 'angle':
                    if(value==''){
                        result = "You must define an angle value for "+node.type;
                    }
                    break;

                case 'raduis':
                    if(value==''){
                        result = "You must define a radius for "+node.type;
                    }
                    break;

                case 'default':
                    if(value==''){
                        result = "Set a default value for "+node.type;
                    }
                    break;

                default:
                    // Default code if no case matches
            }
            if(result == -256){
                /*
                if(node.type =='Sx'){
                    if (!['float', 'int'].includes(value)) {
                        result = "The type " + value + " of the parameter for " + node.type + " is not accepted";
                    }
                }*/
            }
        }
    }
    return result
}