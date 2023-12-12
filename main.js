const fs = require("fs");
const { gcd } = require('mathjs')

const alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const prevalentIndex = 15;
const delta = 0;
let keys = [];

const PATH = {
    preparedText: "./rawText.txt",
    decipherText: "./result/decipherText.txt",  
    encryptedText: "./result/encryptedText.txt",
    resultStat: "./result/resultStat.txt", 
}

function getText(path){
    return fs.promises.readFile(path, { encoding: "utf-8" });
}

async function writeText(path, data, consoleMessage = ""){
    fs.promises.access(path, fs.constants.F_OK)
        .then(() => {})
        .catch(() => fs.promises.writeFile(path, data))
        .then(() =>  { if(consoleMessage) console.log(consoleMessage) })
}

function getResultStat(stat){
    const len = Object.values(stat).reduce((prev, cur) => prev + cur);
    let result = {
        len: len,
        index: Number((Object.values(stat).reduce((prev, cur) => prev + cur*(cur-1), 0) / (len * (len-1))).toFixed(4)),
        symbols: []
    };
    for(let s in stat){
        result.symbols.push({[s]: Number((stat[s] / len).toFixed(6))});
    }
    result.symbols.sort((a, b) => Object.values(b)[0] - Object.values(a)[0]);

    return result;
}

function analyzeText(text){
    let result = {};
    for(let s of text){
        if(s in result)
            result[s]++;
        else
            result[s] = 1;
    }
    return result;
}

function getPrevalentSymbols(stat, delta){
    let result = [Object.keys(stat.symbols[0])[0]];
    
    for(let i=1; i<stat.symbols.length; i++){
        if(Math.abs(Object.values(stat.symbols[0])[0] - Object.values(stat.symbols[i])[0]) <= delta)
            result.push(Object.keys(stat.symbols[i])[0]);
    }
    return result;
}   

function decipherPrevalentSymbols(prevalentSymbols){
    let result = [];

    for(let s of prevalentSymbols){
        if(alphabet.indexOf(s) >= prevalentIndex)
            result.push(alphabet[alphabet.indexOf(s) - prevalentIndex]);
        else
            result.push(alphabet[alphabet.length - prevalentIndex + alphabet.indexOf(s)])
    }
    return result;
}

function getKeyVariants(textGroups){
    let resultArrays = [];
     
    for(let g of textGroups){
        let stat = getResultStat(analyzeText(g));
        let prevalentSymbols = getPrevalentSymbols(stat, delta);
        resultArrays.push(decipherPrevalentSymbols(prevalentSymbols));
    }

    let result = [];
    resultArrays.forEach((el) => {
        if(el.length === 1)
            result.push(el[0])
        else
            result.push(el);
    });
    return result;
}

function getKeyLength(text){
    let partLen = 10;

    let part, currentIndex, lastIndex, distArr;

    while(partLen >= 3){
        distArr = [];
        for(let i=0; i<text.length-partLen+1; i++){
            part = text.slice(i, i+partLen);
            lastIndex = i;
            do{
                currentIndex = text.indexOf(part, lastIndex + partLen);
                if(currentIndex !== -1){
                    distArr.push(currentIndex - lastIndex);
                    lastIndex = currentIndex;
                }
            }
            while(currentIndex !== -1);  
        }

        if(distArr.length > 1){
            return gcd(...distArr);
        }
        else
            partLen--;   
    }
    throw new Error("keyLength not found");
}

function getKeyIndexes(key, alphabet){
    let keyIndexes = [];
    
    for(let s of key){
        keyIndexes.push(alphabet.indexOf(s));
    }
    return keyIndexes;
}

function getKey(keyVariants){
    for(let i=0; i<keyVariants.length; i++){
        if(keyVariants[i].length > 1){
            keyVariants[i].forEach(el => getKey([...keyVariants.slice(0, i), el, ...keyVariants.slice(i+1)]));
            return;
        }
    }
    keys.push(keyVariants.join(""));
}

function getTextGroups(text, keyLength){
    let str;
    let result = [];
    for(let i=0; i<keyLength; i++){
        str = [];
        for(let j=i; j<text.length; j+=keyLength){
            str.push(text[j]);
        }
        result.push(str.join(""));
    }
    return result;
}

function decipherText(text, keyIndexes){
    let result = [];
    let ketAlphabetIndex, textAlphabetIndex;

    for(let i=0; i<text.length; i++){
        ketAlphabetIndex = keyIndexes[i % keyIndexes.length]
        textAlphabetIndex = alphabet.indexOf(text[i]);
        if(textAlphabetIndex >= ketAlphabetIndex){
            result.push(alphabet[textAlphabetIndex - ketAlphabetIndex]);
        }
        else
            result.push(alphabet[alphabet.length - ketAlphabetIndex + textAlphabetIndex]);
    }

    writeText(PATH.decipherText, result.join(""), "decipherText writed");
    return result.join("");
}

async function main(){
    const text = (await getText(PATH.preparedText)).toString();
    let keyLength = getKeyLength(text);
    let textGroups = getTextGroups(text, keyLength);
    let keyVariants = getKeyVariants(textGroups);
    getKey(keyVariants);
    decipherText(text, getKeyIndexes(keys[0], alphabet));
}

main();
