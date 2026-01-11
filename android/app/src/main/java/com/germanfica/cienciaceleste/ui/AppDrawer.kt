package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Balance
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.ShortText
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Icon

@Composable
fun AppDrawer(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    var query by rememberSaveable { mutableStateOf("") }

    val contentColor = Color(0xFFE3E3E3)
    val itemColors = NavigationDrawerItemDefaults.colors(
        unselectedContainerColor = Color.Transparent,
        selectedContainerColor = Color.White.copy(alpha = 0.10f),
        unselectedTextColor = contentColor,
        unselectedIconColor = contentColor,
        selectedTextColor = contentColor,
        selectedIconColor = contentColor
    )

    ModalDrawerSheet(
        modifier = modifier,
        drawerContainerColor = Color(0xFF0B0B0B),
        drawerContentColor = contentColor
    ) {
        Spacer(Modifier.height(14.dp))

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .fillMaxWidth(),
            singleLine = true,
            shape = RoundedCornerShape(28.dp),
            placeholder = { Text("Search", color = contentColor.copy(alpha = 0.70f)) },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = "Buscar", tint = contentColor) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = contentColor.copy(alpha = 0.25f),
                unfocusedBorderColor = contentColor.copy(alpha = 0.18f),
                cursorColor = contentColor,
                focusedTextColor = contentColor,
                unfocusedTextColor = contentColor
            )
        )

        Spacer(Modifier.height(18.dp))

        NavigationDrawerItem(
            icon = { Icon(Icons.Outlined.Balance, contentDescription = null) },
            label = { Text("Divinas leyes", style = MaterialTheme.typography.titleMedium) },
            selected = currentRoute?.startsWith("divinasLeyes") == true,
            onClick = { onNavigate(Route.DivinasLeyes.of(1)) },
            colors = itemColors,
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        Spacer(Modifier.height(6.dp))

        NavigationDrawerItem(
            icon = { Icon(Icons.Outlined.Article, contentDescription = null) },
            label = { Text("Divinos rollos telepaticos", style = MaterialTheme.typography.titleMedium) },
            selected = currentRoute?.startsWith("rollos") == true || currentRoute?.startsWith("rollo") == true,
            onClick = { onNavigate(Route.Rollos.of(1)) },
            colors = itemColors,
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        Spacer(Modifier.height(6.dp))

        NavigationDrawerItem(
            icon = { Icon(Icons.Outlined.ShortText, contentDescription = null) },
            label = { Text("Divinos mini rollos", style = MaterialTheme.typography.titleMedium) },
            selected = currentRoute?.startsWith("minirollos") == true || currentRoute?.startsWith("minirollo") == true,
            onClick = { onNavigate(Route.Minirollos.of(1)) },
            colors = itemColors,
            modifier = Modifier.padding(horizontal = 12.dp)
        )

        Spacer(Modifier.height(12.dp))
    }
}
