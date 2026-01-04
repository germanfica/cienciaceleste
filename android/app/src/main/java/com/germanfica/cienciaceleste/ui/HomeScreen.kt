package com.germanfica.cienciaceleste.ui

import androidx.compose.ui.unit.dp
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import com.germanfica.cienciaceleste.data.RemoteConfig
import com.germanfica.cienciaceleste.ui.theme.AzulTexto

@Composable
fun HomeScreen(nav: NavController) {
    FrameScaffold(topImageUrl = RemoteConfig.TOPLONG) {
        MenuRow("1", "DIVINAS LEYES") { nav.navigate(Route.DivinasLeyes.of(1)) }
        Spacer(Modifier.height(12.dp))
        MenuRow("2", "DIVINOS ROLLOS TELEPATICOS") { nav.navigate(Route.Rollos.of(1)) }
        Spacer(Modifier.height(12.dp))
        MenuRow("3", "DIVINOS MINI ROLLOS") { nav.navigate(Route.Minirollos.of(1)) }
    }
}

@Composable
private fun MenuRow(n: String, label: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Text("$n  ", fontSize = 22.sp, color = AzulTexto)
        Text(label, fontSize = 22.sp, color = AzulTexto)
    }
}
