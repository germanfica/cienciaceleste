package com.germanfica.cienciaceleste.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Balance
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.ShortText
import androidx.compose.material3.DrawerDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.unit.dp

@Composable
fun AppDrawer(
    currentRoute: String?,
    onNavigate: (String) -> Unit,
    isDarkTheme: Boolean,
    onToggleTheme: () -> Unit,
    searchExpanded: Boolean,
    onSearchExpandedChange: (Boolean) -> Unit,
    collapseSearchNonce: Int,
    modifier: Modifier = Modifier
) {
    var query by rememberSaveable { mutableStateOf("") }
    val focusManager = LocalFocusManager.current

    // Evento desde MainActivity: colapsar buscador (y limpiar foco)
    LaunchedEffect(collapseSearchNonce) {
        if (searchExpanded) {
            focusManager.clearFocus(force = true)
            onSearchExpandedChange(false)
        }
    }

    val gap by animateDpAsState(
        targetValue = if (searchExpanded) 0.dp else 10.dp,
        animationSpec = tween(200),
        label = "SearchGap"
    )

    val contentColor = Color(0xFFE3E3E3)
    val itemColors = NavigationDrawerItemDefaults.colors(
        unselectedContainerColor = Color.Transparent,
        selectedContainerColor = Color.White.copy(alpha = 0.10f),
        unselectedTextColor = contentColor,
        unselectedIconColor = contentColor,
        selectedTextColor = contentColor,
        selectedIconColor = contentColor
    )

    BoxWithConstraints(modifier = modifier.fillMaxHeight()) {
        val fullWidth = maxWidth
        val collapsedWidth = minOf(fullWidth, DrawerDefaults.MaximumDrawerWidth)
        val targetWidth = if (searchExpanded) fullWidth else collapsedWidth

        val sheetWidth by animateDpAsState(
            targetValue = targetWidth,
            animationSpec = tween(220),
            label = "DrawerWidth"
        )

        Surface(
            modifier = Modifier
                .fillMaxHeight()
                .width(sheetWidth),
            color = Color(0xFF0B0B0B),
            contentColor = contentColor,
            tonalElevation = DrawerDefaults.ModalDrawerElevation,
            shape = if (searchExpanded) RectangleShape else DrawerDefaults.shape
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .windowInsetsPadding(DrawerDefaults.windowInsets)
            ) {
                Spacer(Modifier.height(14.dp))

                Row(
                    modifier = Modifier
                        .padding(horizontal = 16.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        modifier = Modifier
                            .weight(1f)
                            .animateContentSize(animationSpec = tween(220))
                            .onFocusChanged { fs ->
                                onSearchExpandedChange(fs.isFocused)
                            },
                        singleLine = true,
                        shape = RoundedCornerShape(28.dp),
                        placeholder = { Text("Search", color = contentColor.copy(alpha = 0.70f)) },
                        leadingIcon = {
                            AnimatedContent(
                                targetState = searchExpanded,
                                transitionSpec = { fadeIn(tween(120)) togetherWith fadeOut(tween(90)) },
                                label = "SearchLeadingIcon"
                            ) { expanded ->
                                if (expanded) {
                                    IconButton(
                                        onClick = {
                                            // Back icon (del buscador): colapsa, pero no cierra el drawer
                                            focusManager.clearFocus(force = true)
                                            onSearchExpandedChange(false)
                                        }
                                    ) {
                                        Icon(
                                            imageVector = Icons.AutoMirrored.Outlined.ArrowBack,
                                            contentDescription = "Volver",
                                            tint = contentColor
                                        )
                                    }
                                } else {
                                    Icon(
                                        imageVector = Icons.Outlined.Search,
                                        contentDescription = "Buscar",
                                        tint = contentColor
                                    )
                                }
                            }
                        },
                        trailingIcon = {
                            if (query.isNotBlank()) {
                                IconButton(onClick = { query = "" }) {
                                    Icon(
                                        imageVector = Icons.Outlined.Close,
                                        contentDescription = "Borrar",
                                        tint = contentColor
                                    )
                                }
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = contentColor.copy(alpha = 0.25f),
                            unfocusedBorderColor = contentColor.copy(alpha = 0.18f),
                            cursorColor = contentColor,
                            focusedTextColor = contentColor,
                            unfocusedTextColor = contentColor
                        )
                    )

                    Spacer(Modifier.width(gap))

                    AnimatedVisibility(
                        visible = !searchExpanded,
                        enter = fadeIn(tween(140)) + expandHorizontally(tween(200)),
                        exit = fadeOut(tween(90)) + shrinkHorizontally(tween(180))
                    ) {
                        IconButton(onClick = onToggleTheme) {
                            Icon(
                                imageVector = if (isDarkTheme) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                                contentDescription = "Cambiar tema",
                                tint = contentColor
                            )
                        }
                    }
                }

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
    }
}
