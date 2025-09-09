// index.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuración Google Sheets usando variable de entorno
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// 📌 Obtener invitados
app.get("/invitados", async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Test!A2:E",
    });

    const rows = response.data.values || [];
    const invitados = rows.map((r) => ({
      idGrupo: r[0],
      cantidad: r[1],
      nombre: r[2],
      confirmacion: r[3] || "",
      preferencias: r[4] || "",
    }));

    res.json(invitados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error leyendo la hoja" });
  }
});

// 📌 Confirmar asistencia individual
app.post("/confirmar", async (req, res) => {
  try {
    const { nombre, confirmacion, preferencias } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Test!C2:C",
    });

    const rows = response.data.values || [];
    const index = rows.findIndex((r) => r[0] === nombre);
    if (index === -1) return res.status(404).json({ error: "Invitado no encontrado" });

    const rowNumber = index + 2;

    // Actualizar confirmación
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Test!D${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [[confirmacion || "CONFIRMADO ✅"]] },
    });

    // Actualizar preferencias
    if (preferencias) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Test!E${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[preferencias]] },
      });
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error confirmando asistencia" });
  }
});

// 📌 Confirmar asistencia por grupo
app.post("/confirmar-grupo", async (req, res) => {
  try {
    const { idGrupo, confirmacion, preferencias } = req.body;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Test!A2:A",
    });

    const rows = response.data.values || [];
    const indices = [];

    rows.forEach((r, i) => {
      if (r[0] === idGrupo) indices.push(i + 2);
    });

    if (indices.length === 0) return res.status(404).json({ error: "Grupo no encontrado" });

    for (const rowNumber of indices) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Test!D${rowNumber}`,
        valueInputOption: "RAW",
        requestBody: { values: [[confirmacion || "CONFIRMADO ✅"]] },
        
      });

      if (preferencias) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Test!E${rowNumber}`,
          valueInputOption: "RAW",
          requestBody: { values: [[preferencias]] },
        });
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error confirmando asistencia por grupo" });
  }
});

// Puerto y start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
