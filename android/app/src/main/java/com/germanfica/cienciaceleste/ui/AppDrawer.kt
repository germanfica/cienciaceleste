package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun AppDrawer(
    currentRoute: String?,
    onNavigate: (String) -> Unit
) {
    ModalDrawerSheet {
        Spacer(Modifier.height(12.dp))

        Text(
            text = "Secciones",
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
        )

        NavigationDrawerItem(
            label = { Text("Divinas leyes") },
            selected = currentRoute?.startsWith("divinasLeyes") == true,
            onClick = { onNavigate(Route.DivinasLeyes.of(1)) },
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        NavigationDrawerItem(
            label = { Text("Divinos rollos telepaticos") },
            selected = currentRoute?.startsWith("rollos") == true || currentRoute?.startsWith("rollo") == true,
            onClick = { onNavigate(Route.Rollos.of(1)) },
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        NavigationDrawerItem(
            label = { Text("Divinos mini rollos") },
            selected = currentRoute?.startsWith("minirollos") == true || currentRoute?.startsWith("minirollo") == true,
            onClick = { onNavigate(Route.Minirollos.of(1)) },
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        Spacer(Modifier.height(12.dp))
    }
}
