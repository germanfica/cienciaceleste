# classic

This application was developed with the goal of creating a new alternative for accessing the rollos telepáticos in a safer, more maintainable, and long-term-friendly format.
By converting the content into Markdown (`.md`), it ensures the data remains in a simple, widely-supported, and human-readable format that can be easily distributed, read, and consumed across different platforms and devices.
Markdown was chosen specifically for its simplicity and portability, making it ideal for archival and sharing purposes.

## Requirements

- Node.js 18+
- TypeScript (for building from source)

## Installation

1. Clone the repository or download the source code.
2. Install dependencies:
   ```bash
   npm install
   ```

## Build

Compile the TypeScript source into JavaScript:

```bash
npm run build
```

## Usage

Run the converter after building:

```bash
node ./dist/index.js --in "./mis_htm" --out "./markdown" --pattern "detallerollo.php-id=*\\&pagina=*.htm" --images true --concurrency 8
```

### Parameters

| Parameter       | Required | Default                                | Description                                               |
| --------------- | -------- | -------------------------------------- | --------------------------------------------------------- |
| `--in` / `-i`   | Yes      | —                                      | Input directory containing `.htm` files.                  |
| `--out` / `-o`  | Yes      | —                                      | Output directory where `.md` files will be saved.         |
| `--pattern`     | No       | `detallerollo.php-id=*\\&pagina=*.htm` | Glob pattern to match `.htm` files.                       |
| `--images`      | No       | `true`                                 | Whether to include the main image in the Markdown output. |
| `--concurrency` | No       | `8`                                    | Number of files to process in parallel.                   |

## Example

```bash
npm run build
node ./dist/index.js --in "./mis_htm" --out "./markdown" --pattern "detallerollo.php-id=*\\&pagina=*.htm" --images true --concurrency 8
```

```bash
node ./dist/index.js --in "../" --out "./markdown" --pattern "detallerollo.php-id=*\\&pagina=*.htm" --images true --concurrency 8
```

This command will:

* Read all `.htm` files matching the provided pattern from `./mis_htm`.
* Convert each file into a `.md` file.
* Save the Markdown files into `./markdown`.
* Embed the main image (if available) in the Markdown output.
* Process up to 8 files concurrently.

---

## Output

The output Markdown files will follow the naming format:

```
id-<ID>_pagina-<PAGE>__<TITLE>.md
```

Example:

```
id-100_pagina-8__The-Beginning.md
```

---

## License

This project is released under the MIT License.
