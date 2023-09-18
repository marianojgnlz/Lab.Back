const path = "D:/GitHub/FileBackup";

export const createFile = async (username, fileName, content) => {
    await Deno.writeTextFile(`${path}/${username}-${fileName}.txt`, content);
}

export const getFiles = async () => {
    const fileNames = [];

    for await (const dirEntry of Deno.readDir(path)) {
        if (dirEntry.isFile) {
            fileNames.push(dirEntry.name);
        }
    }

    return fileNames;
}


export const getFile = async (fileName) => {
    const file = await Deno.readFile(`${path}/${fileName}`);
    const decodedFile = new TextDecoder().decode(file);

    return decodedFile;
}
