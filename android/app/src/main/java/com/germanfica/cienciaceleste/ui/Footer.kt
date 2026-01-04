package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.germanfica.cienciaceleste.ui.theme.Naranja
import com.germanfica.cienciaceleste.ui.theme.Blanco

@Composable
fun Footer() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 8.dp)
            .widthIn(max = 1000.dp)
            .background(Naranja)
            .padding(horizontal = 16.dp, vertical = 14.dp)
    ) {
        val style = androidx.compose.ui.text.TextStyle(
            color = Blanco,
            fontSize = 14.sp,
            textAlign = TextAlign.Center
        )

        Text("Vean los Rollos originales de la Divina Revelación Alfa y Omega en", style = style, modifier = Modifier.fillMaxWidth())
        Text("Local Principal - Av. José Galvez 1775 - Lince - Lima - Peru", style = style, modifier = Modifier.fillMaxWidth())
        Text("Telefono: (51-1) 471-5921 (51-1) 2658326", style = style, modifier = Modifier.fillMaxWidth())
        Text("alfayomega_amor@hotmail.com", style = style, modifier = Modifier.fillMaxWidth())
        Text("© Copyright. Hermandad del Cordero de Dios.", style = style, modifier = Modifier.fillMaxWidth())
        Text("Recuperado de: https://www.alfayomega.pe/", style = style, modifier = Modifier.fillMaxWidth())
    }
}
