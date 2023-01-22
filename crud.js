var fs = require("fs");

function getAll(fileName) {
  let file;
  try {
    file = fs.readFileSync(fileName);
  } catch (ex) {
    Append(fileName, "");
    file = fs.readFileSync(fileName);
  }
  return (file = JSON.parse(file.toString()));
}

function Append(fileName, data) {
  let file;
  try {
    file = fs.readFileSync(fileName);
  } catch (ex) {
    console.log("Now creating file " + fileName);
    fs.writeFileSync(fileName, "[]");
    console.log("Done");
  }
  if (data) {
    file = fs.readFileSync(fileName);
    const json = JSON.parse(file.toString());
    json.push(data);
    fs.writeFileSync(fileName, JSON.stringify(json));
  }
  return data;
}

function Update(fileName, data) {
  fs.writeFileSync(fileName, JSON.stringify(data));
}
module.exports = { getAll, Append, Update };
