const readline = require('node:readline');

const lines = readline.createInterface({ input: process.stdin });

const fs = require('node:fs');
const path = require('node:path');

const lectures = JSON.parse(fs.readFileSync(path.join(__dirname, 'lectures.json'), 'utf8'));


const tools = [
  {
    name: 'find_lecture',
    description: 'Return the title and topics of one course lecture by its number, 1 to 12. Use it when asked what a lecture covers.',
    inputSchema: {
      type: 'object',
      properties: { number: { type: 'integer', description: 'Lecture number, 1 to 12' } },
      required: ['number'],
    },
  }, {

    name: 'find_files_in_directory',
    description: 'Find the file names in a specified directory in the workspace',
    inputSchema: {
      type: 'object',
      properties: { directory_name: { type: 'string', description: 'Directory name' } },
      required: ['directory_name'],
    },

  }
];

lines.on('line', (line) => {
  console.error('got: ' + line);
  const reply = handle(JSON.parse(line));
  if (reply) send(reply);
});

// Decide what to answer. Return the reply, or null to answer nothing.
function handle(msg) {
  if (msg.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: msg.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: 'lectures', version: '0.1.0' },
      },
    };
  }
  if (msg.method === 'notifications/initialized') {
    return null; // a notification: it has no id and gets no reply
  }
  if(msg.method === 'tools/list') {

    return {
        jsonrpc: '2.0',
        id: msg.id,
        result : {tools : tools}}
  }
  if(msg.method === 'tools/call') {
    const name = msg.params.name;
    const args = msg.params.arguments || {};

    if (name === 'find_lecture') {
        const lecture = lectures.find((l) => l.number === args.number);
        if (!lecture) {
            // The tool ran and failed: a normal result the model can read, marked isError.
            return textResult(msg.id, 'There is no lecture ' + args.number + '. The course has lectures 1 to 12.', true);
        }
        return textResult(msg.id, 'Lecture ' + lecture.number + ': ' + lecture.title + '. Topics: ' + lecture.topics, false);
    }

    if (name === 'find_files_in_directory') {
        const files = listDirectoryFiles('./' + args.directory_name);
        const concatenatedFiles = files.join(', ');
        return textResult(msg.id, 'Files in directory: ' +args.directory_name + ' are: ' +concatenatedFiles, false);
    }

    return { jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Unknown tool: ' + name } };

  }
  if (msg.id !== undefined) {
    // Any other request we do not know.
    return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Unknown method: ' + msg.method } };
  }
    return null;
}

// Print one reply as one line of JSON on stdout.
function send(reply) {
    process.stdout.write(JSON.stringify(reply) + '\n');
}


// A tool result: one text part, and whether the tool failed.
function textResult(id, text, isError) {
  return { jsonrpc: '2.0', id: id, result: { content: [{ type: 'text', text: text }], isError: isError } };
}

function listDirectoryFiles(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    return files;
  } catch (err) {
    console.error(`Грешка при четене на директория "${dirPath}":`, err.message);
    return [];
  }
}