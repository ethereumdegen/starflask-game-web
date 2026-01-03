
# Inventory UI in Bevy 
 

In this blog I will attempt to explain how I built this inventory UI using bevy UI and only about 200 lines of frontend code (lots of code is tucked/abstracted away to stay DRY) .  

![Alt Text](/blog/inventory.png)




First of all, I set up most of the configuration in Enums to make alterations simpler and to be able to make use of loops in the code: 

```



#[derive(Component, Default)]
pub struct InventoryUiContainerGrid {}

impl InventoryUiContainerGrid {
    fn get_grid_tile_size() -> [u32; 2] {
        [50, 50]
    }

    fn get_grid_dimensions() -> [u32; 2] {
        [10, 6]
    }

    fn get_render_offset() -> [u32; 2] {
        [14, 547]
    }
}

#[derive(Clone, Eq, PartialEq, Debug, Component)]
pub struct InventoryUiInventorySlot(usize);

#[derive(Clone, Hash, Eq, PartialEq, Debug, Component)]
pub enum InventoryUiEquipmentSlot {
    Head,
    ShoulderLeft,
    ShoulderRight,
    Chest,
    Belt,
    Legs,
    Feet,
    HandLeft,
    HandRight,
    WeaponLeft,
    WeaponRight,

    WeaponHolder(usize),
    Backpack,
}

impl InventoryUiEquipmentSlot {
    pub fn get_all_slots() -> Vec<Self> {
        vec![
            InventoryUiEquipmentSlot::Head,
            InventoryUiEquipmentSlot::ShoulderLeft,
            InventoryUiEquipmentSlot::ShoulderRight,
            InventoryUiEquipmentSlot::Chest,
            InventoryUiEquipmentSlot::Belt,
            InventoryUiEquipmentSlot::Legs,
            InventoryUiEquipmentSlot::Feet,
            InventoryUiEquipmentSlot::HandLeft,
            InventoryUiEquipmentSlot::HandRight,
            InventoryUiEquipmentSlot::WeaponLeft,
            InventoryUiEquipmentSlot::WeaponRight,
            InventoryUiEquipmentSlot::WeaponHolder(0),
            InventoryUiEquipmentSlot::WeaponHolder(1),
            InventoryUiEquipmentSlot::WeaponHolder(2),
            InventoryUiEquipmentSlot::WeaponHolder(3),
            InventoryUiEquipmentSlot::Backpack,
        ]
    }

    pub fn get_inventory_slot_type(&self, selected_weapon_index: usize) -> InventorySlotType {
        match self {
            InventoryUiEquipmentSlot::Head => InventorySlotType::Head,

            InventoryUiEquipmentSlot::ShoulderLeft => InventorySlotType::Shoulders,
            InventoryUiEquipmentSlot::ShoulderRight => InventorySlotType::Shoulders,
            InventoryUiEquipmentSlot::Chest => InventorySlotType::Chest,
            InventoryUiEquipmentSlot::Belt => InventorySlotType::Waist,
            InventoryUiEquipmentSlot::Legs => InventorySlotType::Legs,
            InventoryUiEquipmentSlot::Feet => InventorySlotType::Feet,

            InventoryUiEquipmentSlot::HandLeft => InventorySlotType::Hands,
            InventoryUiEquipmentSlot::HandRight => InventorySlotType::Hands,
            InventoryUiEquipmentSlot::WeaponLeft => {
                InventorySlotType::Weapon(selected_weapon_index)
            }
            InventoryUiEquipmentSlot::WeaponRight => {
                InventorySlotType::Weapon(selected_weapon_index)
            }

            InventoryUiEquipmentSlot::WeaponHolder(i) => InventorySlotType::Weapon(*i),
            InventoryUiEquipmentSlot::Backpack => InventorySlotType::Back,
        }
    }

    pub fn get_render_offset(&self) -> [u32; 2] {
        match self {
            InventoryUiEquipmentSlot::Head => [110, 8],

            InventoryUiEquipmentSlot::ShoulderLeft => [182, 75],
            InventoryUiEquipmentSlot::ShoulderRight => [40, 75],
            InventoryUiEquipmentSlot::Chest => [100, 100],
            InventoryUiEquipmentSlot::Belt => [100, 214],
            InventoryUiEquipmentSlot::Legs => [110, 250],
            InventoryUiEquipmentSlot::Feet => [110, 340],

            InventoryUiEquipmentSlot::HandLeft => [10, 175],
            InventoryUiEquipmentSlot::HandRight => [205, 175],
            InventoryUiEquipmentSlot::WeaponLeft => [10, 313],
            InventoryUiEquipmentSlot::WeaponRight => [215, 313],

            InventoryUiEquipmentSlot::WeaponHolder(i) => {
                [278 + (*i as u32 % 2) * 62, 32 + ((*i / 2) as u32) * 120]
            }

            InventoryUiEquipmentSlot::Backpack => [300, 306],
        }
    }

    pub fn flip_y(&self) -> bool {
        match self {
            InventoryUiEquipmentSlot::WeaponHolder(_i) => true,
            _ => false,
        }
    }

    pub fn get_render_dimensions(&self) -> [u32; 2] {
        match self {
            InventoryUiEquipmentSlot::Head => [40, 46],
            InventoryUiEquipmentSlot::Chest => [60, 90],
            InventoryUiEquipmentSlot::Belt => [60, 16],
            InventoryUiEquipmentSlot::Legs => [45, 65],
            InventoryUiEquipmentSlot::Feet => [45, 65],
            InventoryUiEquipmentSlot::HandLeft => [45, 45],
            InventoryUiEquipmentSlot::HandRight => [45, 45],
            InventoryUiEquipmentSlot::WeaponLeft => [45, 100],
            InventoryUiEquipmentSlot::WeaponRight => [45, 100],
            InventoryUiEquipmentSlot::WeaponHolder(_i) => [45, 100],

            InventoryUiEquipmentSlot::Backpack => [80, 80],
            _ => [36, 36],
        }
    }

    //just draw a red /   through this icon but... allow interact w it
    pub fn get_slot_is_redundant(&self) -> bool {
        match self {
            InventoryUiEquipmentSlot::ShoulderRight => true,
            InventoryUiEquipmentSlot::HandRight => true,

            _ => false,
        }
    }
}



```



Next, and this is a gigantic chunk of code, but I simply spawn the UI nodes and I attach 'smart components' to them.  These are components that are able to dynamically change the ui elements other components each frame by reading the state of &World. 


```



fn spawn_inventory_menu(
    mut commands: Commands,

    texture_atlas_assets: Res<TextureAtlasAssets>,

    images: Res<TextureAssets>,
) {
    //get rid of expects

    let panel_inventory_handle = images
        .ui
        .get("PanelInventory.png")
        .expect("PanelInventory not found");
    let panel_inventory_body_handle = images
        .ui
        .get("PanelInventory_Body3.png")
        .expect("PanelInventory_Body3 not found");

    let _panel_inventory_horiz_weapon_slot_handle = images
        .ui
        .get("PanelInventory_HorizontalWeaponSlot.png")
        .expect("PanelInventory_HorizontalWeaponSlot not found");

    //add the extra weapon slots  !

    let _inventory_select_cell_handle = images
        .ui
        .get("Inventory_SelectCell.png")
        .expect("Inventory_SelectCell not found");

    let elements_map = HashMap::new();

    let root_node = commands
        .spawn(Node {
            width: Val::Percent(100.0),
            height: Val::Percent(100.0),
            position_type: PositionType::Absolute,
            top: Val::Px(0.0),
            left: Val::Px(0.0),

            display: Display::Flex,
            flex_direction: FlexDirection::Row,
            justify_content: JustifyContent::FlexEnd,
            align_items: AlignItems::Center,

            //justify_content: JustifyContent::Center,
            ..default()
        })
        .id();

    let container_node = commands
        .spawn((
            Node {
                display: Display::Flex,
                flex_direction: FlexDirection::Column, // Set direction to column for vertical layout
                justify_content: JustifyContent::FlexStart, // Adjust main axis  distribution as needed
                align_items: AlignItems::FlexStart, // Adjust cross axis alignment as needed (center, flex-end, etc.)

                flex_wrap: FlexWrap::Wrap, //use multiple lines

                width: Val::Px(527.0),
                height: Val::Px(888.0),
                right: Val::Px(30.0),

                ..default()
            },
            BackgroundColor(Color::srgb(0.3, 0.3, 0.3).into()),
        ))
        // .add_child(title_node)
        .id();

    let panel_background_node: Entity = commands
        .spawn((
            Node {
                position_type: PositionType::Absolute,
                //top: Val::Px(0.0),
                //left: Val::Px(0.0),
                width: Val::Px(527.),
                height: Val::Px(888.),
                ..default()
            },
            ImageNode {
                image: panel_inventory_handle.clone(),

                ..default()
            },
            Visibility::Inherited,
        ))
        .id();

    commands
        .entity(container_node)
        .add_child(panel_background_node);

    let icons_atlas = &texture_atlas_assets.item_icons_atlas.as_ref().unwrap();

    for tile_x in 0..InventoryUiContainerGrid::get_grid_dimensions()[0] {
        for tile_y in 0..InventoryUiContainerGrid::get_grid_dimensions()[1] {
            let inventory_slot_index_offset =
                tile_x + (tile_y * InventoryUiContainerGrid::get_grid_dimensions()[0]);
            let inventory_slot_index = 100 + inventory_slot_index_offset;
            let z_index = 200 - inventory_slot_index_offset;

            let tile_size = InventoryUiContainerGrid::get_grid_tile_size();

            let render_offset: Vec2 = Vec2::new(
                (InventoryUiContainerGrid::get_render_offset()[0] + tile_x * 50) as f32,
                (InventoryUiContainerGrid::get_render_offset()[1] + tile_y * 50) as f32,
            );

            let tile_slot_node = commands
                .spawn((
                    Button,
                    Interaction::default(),
                    Node {
                        position_type: PositionType::Absolute,

                        left: Val::Px(render_offset.x),
                        top: Val::Px(render_offset.y),

                        width: Val::Px(tile_size[0] as f32),
                        height: Val::Px(tile_size[1] as f32),
                        ..default()
                    },
                    ImageNode {
                        color: Color::WHITE,
                        image: icons_atlas.image.clone_weak(),
                        flip_x: false,
                        flip_y: false,
                        texture_atlas: Some(TextureAtlas {
                            layout: icons_atlas.layout.clone_weak(),
                            index: 1,
                        }),

                        ..default()
                    },
                    Visibility::Inherited,
                    ZIndex(z_index as i32),
                    UiIconComponent { icon_source: None },
                    DynamicIconDimensions {
                        tile_size,
                        icon_source: None,
                    },
                    InventoryUiInventorySlot(inventory_slot_index as usize),
                    CursorGrabComponent {
                        grab_source: Some(CursorGrabDataSource::InventorySlot(
                            inventory_slot_index as usize,
                        )),
                        ..default()
                    },
                    CursorDropListenerComponent,
                    TooltipDataSource::new(Some(Box::new(InventoryItemSlotTooltipSource(
                        inventory_slot_index as usize,
                    )))),
                ))
                .id();

            // ------
            let stacksize_container = commands
                .spawn((
                    Node {
                        position_type: PositionType::Absolute,
                        right: Val::Px(2.0),
                        bottom: Val::Px(2.0),
                        width: Val::Px(12.0),
                        height: Val::Px(12.0),
                        ..default()
                    },
                    BackgroundColor(Color::srgb(0.0, 0.0, 0.0)),
                    UiVisibilityControl::new(Some(Box::new(
                        InventorySlotStackSizeVisibilitySource(inventory_slot_index as usize),
                    ))),
                ))
                .id();

            commands
                .ui_builder(stacksize_container)
                .label(LabelConfig {
                    label: "?".to_string(),
                    color: Color::srgb(1.0, 1.0, 1.0),
                    ..default()
                })
                .insert(DynamicTextDataSource {
                    label_source: Some(Box::new(InventorySlotStackSizeTextLabelDataSource(
                        inventory_slot_index as usize,
                    ))),
                });

            commands
                .entity(tile_slot_node)
                .add_child(stacksize_container);

            // ------

            commands
                .entity(panel_background_node)
                .add_child(tile_slot_node);
        }
    }

    // body and equipment slots

    let mut equipment_ui_slots: HashMap<InventoryUiEquipmentSlot, Entity> = HashMap::new();
    //let icons_atlas = &texture_atlas_assets.item_icons_atlas.as_ref().unwrap();

    let selected_weapon_index = 0; //default

    for ui_equipment_slot in InventoryUiEquipmentSlot::get_all_slots() {
        let offset = ui_equipment_slot.get_render_offset();
        let dimensions = ui_equipment_slot.get_render_dimensions();

        let inventory_slot_index = ui_equipment_slot
            .get_inventory_slot_type(selected_weapon_index)
            .get_inventory_slot_index();

        //use   .texture_atlas_icon(TextureAtlasIconConfig {

        let ui_eq_slot_node = commands
            .spawn((
                Button,
                Node {
                    position_type: PositionType::Absolute,

                    left: Val::Px(offset[0] as f32),
                    top: Val::Px(offset[1] as f32),

                    width: Val::Px(dimensions[0] as f32),
                    height: Val::Px(dimensions[1] as f32),
                    ..default()
                },
                ImageNode {
                    //texture_atlas: gui_pixel_icons_atlas.clone_weak(),
                    //texture_atlas_image: UiTextureAtlasImage{ index: heart_icon_index , flip_x: false, flip_y:false },
                    color: Color::WHITE,
                    image: icons_atlas.image.clone_weak(),
                    texture_atlas: Some(TextureAtlas {
                        layout: icons_atlas.layout.clone_weak(),
                        index: 1,
                    }),
                    flip_x: false,
                    flip_y: ui_equipment_slot.flip_y(),
                    ..default()
                },
                UiIconComponent { icon_source: None },
                ui_equipment_slot.clone(),
                InventoryUiInventorySlot(inventory_slot_index),
                CursorGrabComponent {
                    grab_source: Some(CursorGrabDataSource::InventorySlot(
                        inventory_slot_index as usize,
                    )),
                    ..default()
                },
                CursorDropListenerComponent,
                TooltipDataSource::new(Some(Box::new(InventoryItemSlotTooltipSource(
                    inventory_slot_index as usize,
                )))),
            ))
            .id();

        equipment_ui_slots.insert(ui_equipment_slot, ui_eq_slot_node);
    }

    let panel_background_body_node: Entity = commands
        .spawn((
            Node {
                position_type: PositionType::Absolute,
                top: Val::Px(80.0),
                left: Val::Px(45.0),

                width: Val::Px(405.),
                height: Val::Px(435.),
                ..default()
            },
            ImageNode {
                //texture_atlas: gui_pixel_icons_atlas.clone_weak(),
                //texture_atlas_image: UiTextureAtlasImage{ index: heart_icon_index , flip_x: false, flip_y:false },
                image: panel_inventory_body_handle.clone(),

                //  visibility: Visibility::Inherited,
                ..default()
            },
            InventoryUiBodyPane {
                equipment_ui_slots: equipment_ui_slots.clone(),
            },
        ))
        .id();

    for ui_equipment_slot in InventoryUiEquipmentSlot::get_all_slots() {
        let Some(node) = equipment_ui_slots.get(&ui_equipment_slot) else {
            continue;
        };

        commands.entity(panel_background_body_node).add_child(*node);
    }

    commands
        .entity(container_node)
        .add_child(panel_background_body_node)
        .set_parent(root_node);

    // elements_map.insert("hearts".into(), LinkedUiElement::Array( heart_image_nodes_array  ));

    commands
        .entity(root_node)
        .insert(InventoryMenuComponent::default())
        .insert(UiVisibilityControl::new(Some(Box::new(
            UiMenuStateVisibilitySource(UiMenuType::InventoryMenu),
        ))))
        .insert(UiElementLinker { elements_map });

    //add invisible buttons to the equipment and item tiles !
    // these invis buttons can work just like the buttons in ExitMenu or whatever
}




```


I will explain this in thirds.  The first third is simply spawning the static UI container nodes for the UI menu panel.  Nothing surprising there. 

The second third loops through every tile x to y and spawns the backpack slots which you can see in the lower half of the UI menu. 

The last third loops through every equipment ui slot definition (enum) in order to spawn the equipment slots which are overlayed on top of the static image of the human character outline.  The equipment ui slots share a lot (of components) in common with the inventory ui slots.   So lets talk about these components as they are the secret sauce.  






## UIVisibility Control

The simplest way to understand my 'smart component' immediate mode paradigm is by understading how I do UIVisibility Control.  I simply attach this component to my menu: 

```


  .insert(UiVisibilityControl::new(Some(Box::new(
            UiMenuStateVisibilitySource(UiMenuType::InventoryMenu),
        ))))

```

And then it automagically makes the entire menu visible or invisible based on whether or not the menu is open from that point forwards.  How does it do this?  Like this: 


```



pub(crate) fn ui_visibility_control_plugin(app: &mut App) {
    app.add_systems(
        Update,
        update_visibility.run_if(any_with_component::<UiVisibilityControl>),
    );
}

fn update_visibility(
    mut commands: Commands,

    menu_query: Query<(Entity, &Visibility, &UiVisibilityControl)>,

    // current_state: Res<State<UiMenuState>>, //get me from world !
    world: &World,
) {
    for (vis_entity, _visibility, vis_control) in menu_query.iter() {
        let Some(ref vis_src) = vis_control.vis_source else {
            continue;
        };

        let is_visible = vis_src.is_visible(world);

        if let Some(mut ent) = commands.get_entity(vis_entity) {
            ent.set_ui_visibility(is_visible);
        }
    }
}

pub trait UiVisibilitySource {
    fn is_visible(&self, world: &World) -> bool;
}

#[derive(Component)]
pub struct UiVisibilityControl {
    vis_source: Option<Box<(dyn UiVisibilitySource + Sync + Send + 'static)>>,
}

...




pub struct UiMenuStateVisibilitySource(pub UiMenuType);

impl UiVisibilitySource for UiMenuStateVisibilitySource {
    fn is_visible(&self, world: &World) -> bool {
        let ui_menu_state = world.get_resource::<State<UiMenuState>>();

        let Some(ui_menu_state) = ui_menu_state else {
            return false;
        };

        let ui_menu_state_required = &self.0;

        let visible = match ui_menu_state.get() {
            UiMenuState::NoMenu => false,
            UiMenuState::MenuOpened(menu_type) => menu_type == ui_menu_state_required,
        };

        visible
    }
}

```

Once you fully understand that paradigm, you basically understand everything else I will try to explain.


I do realize that while this paradigm makes building UI incredibly easy, it is slightly inefficient on the CPU side since it runs every frame and when unnecessary.. like when the menu is closed.  I plan to use marker components to tell the systems when UI elements are hidden (could use ViewVisibility to 'return early') later to optimize -- not concerned with it now -- have much bigger fish to fry.   



## UiIcon Source (dynamic) 

A component that describes how to manipulate the ImageNode component on the same component by reading from World every frame. Works on the same paradigm as UIVisibility but instead of sending commands to mutate the Visibility component, it sends commands to mutate the ImageNode component.  

See this crate !!   I bundled much of the code for this in here: 
https://github.com/ethereumdegen/turbo_atlas_icons


```



impl UiIconSource for ItemTypeIconSource {
    fn get_icon_name(&self, world: &World) -> Option<String> {
        let item_types = world.resource::<Assets<ItemType>>();
        let item_system_type_assets = world.resource::<ItemSystemTypeAssets>();

        if let Some(item_type_handle) = item_system_type_assets.item_types.get(self.0.as_str()) {
            if let Some(item_type) = item_types.get(item_type_handle) {
                item_type.icon_texture.clone()
            } else {
                None
            }
        } else {
            None
        }
    }

    fn get_icons_handles_map<'a>(&'a self, world: &'a World) -> &'a TextureHandlesMap {
        let images = world.resource::<TextureAssets>();
        &images.item_icons
    }

    fn get_texture_atlas<'a>(&'a self, world: &'a World) -> &'a Option<TextureAtlasCombined> {
        let texture_atlas_assets = world.resource::<TextureAtlasAssets>();

        &texture_atlas_assets.item_icons_atlas
    }
}


```





This is how i currently handle this, kind of an OOP methodology where I watch for inventory changes and update the UI Icon source item type name based on the inventory items map.  

However if i were to refactor, there is a simpler way: to handle it like how the tooltip system does and just specify in the Box  that the ui icon that should be rendered is the icon for whatever item entity is in the slot by inventory index number.  

For now, I opted to make what is in the Box  just depend on the item type name string for now in order to quickly fix a bug due to the need of having a transparent UI image there as fallback to make the 'drag drop' work.  Up to you.  

```


fn update_inventory_menu_inventory_icons(
    player_query: Query<&InventoryComponent, (Changed<InventoryComponent>, With<Player>)>,

    mut ui_icon_node_query: Query<
        (
            &mut Visibility,
            &mut UiIconComponent,
            Option<&mut DynamicIconDimensions>,
            &InventoryUiInventorySlot,
        ),
        Without<InventoryUiEquipmentSlot>,
    >,
    item_query: Query<&ItemComponent>,
) {
    let Some(item_comp) = player_query.get_single().ok() else {
        return;
    };

    //render equipped stuff like weapons that are on you !!

    for (_visibility, mut icon_comp, mut dimensions_comp, inventory_ui_slot) in
        ui_icon_node_query.iter_mut()
    { 
        icon_comp.icon_source = None;

        if let Some(ref mut dim_comp) = dimensions_comp {
            dim_comp.icon_source = None;
        }

        let item_slot_index = inventory_ui_slot.0;

        // info!("update_inventory_menu_equipment_icons 1 ");
        let Some(item_in_slot_entity) = item_comp.get_item_entity_in_slot_index(&item_slot_index)
        else {
            icon_comp.icon_source =
                Some(Box::new(GuiPixelIconSource("icon_transparent.png".into())));
            continue;
        };

        let Some(item_comp) = item_query.get(*item_in_slot_entity).ok() else {
            continue;
        };

        let item_type_name = item_comp.get_item_type_name();

        icon_comp.icon_source = Some(Box::new(ItemTypeIconSource(item_type_name.clone())));

        if let Some(ref mut dim_comp) = dimensions_comp {
            dim_comp.icon_source = Some(Box::new(ItemTypeIconSource(item_type_name.clone())));
        }

        //modify the width and height ??

        // *visibility = Visibility::Inherited;
    }
}


```

 

## TooltipDataSource 

A component that accepts any struct that implements the trait TooltipDataSourceExt and which, when the element is  hovered, sets a global resource  Option (Entity) to that hovered entity which the Tooltip UI window is reading every frame to determine how to render itself.  


```
#[derive(Component)]
pub struct TooltipDataSource {
     
    pub tooltip_data_source: Option<Box<(dyn TooltipDataSourceExt + Sync + Send + 'static)>>,
}



pub trait TooltipDataSourceExt {
    fn get_tooltip_display_data(&self, world: &World) -> Option<TooltipDisplayData>;
}



pub struct InventoryItemSlotTooltipSource(pub usize); //there are like ten different variants of this... to go on skill icons to buff icons, etc .. hence why its a boxed trait impl 

impl TooltipDataSourceExt for InventoryItemSlotTooltipSource {
    fn get_tooltip_display_data(&self, world: &World) -> Option<TooltipDisplayData> {
        let player_cache_res = world.get_resource::<PlayerEntityCacheResource>()?;
        let player_entity = player_cache_res.get_player_entity()?;

        let inventory_comp = world
            .get_entity(player_entity)
            .ok()
            .map(|e| e.get::<InventoryComponent>())
            .flatten()?;
        let _selected_weapon_comp = world
            .get_entity(player_entity)
            .ok()
            .map(|e| e.get::<SelectedWeaponComp>())
            .flatten()?;

        let item_slot_index = self.0;

         
        let item_entity = inventory_comp.get_item_entity_in_slot_index(&item_slot_index)?;

       
        let combined_item_data = ItemDataCombined::from_entity_ref(*item_entity, &world)?;

        let tooltip_display_data = combined_item_data.get_tooltip_display_data();

        return tooltip_display_data;

        //let item_rune_ability_name = item_slot.get_item_rune_ability_name().clone()?;

        
    }
}


```


I have a tooltip UI window that reads this data as follows, then uses the command 'set_tooltip_display_data' to update its own TextNodes as appropriate each frame , using a custom struct 'tooltip_display_data' which just has some String props or whatever else you need..  : 

```



fn update_tooltip_data_from_source(
    mut commands: Commands,

    tooltip_menu_query: Query<(Entity, &TooltipComponent), With<TooltipComponent>>,

    tooltip_data_source_query: Query<&TooltipDataSource>,

    world: &World,
) {
    let Some((tooltip_menu_comp_entity, tooltip_menu_comp)) = tooltip_menu_query.get_single().ok()
    else {
        return;
    };

    let Some(data_source_entity) = tooltip_menu_comp.tooltip_data_source else {
        return;
    };

    let Some(tooltip_data_source) = tooltip_data_source_query.get(data_source_entity).ok() else {
        return;
    };

    let tooltip_display_data = tooltip_data_source
        .tooltip_data_source
        .as_ref()
        .map(|s| s.get_tooltip_display_data(world))
        .flatten();

    // convert these to structs instead of enum ,  then use WORLD to access junk like inv_comp and then item_slot to then get the impl trait for Tooltip Display

    //use the cached player resource    in WORLD to get the players  inv comp data ?

    commands
        .entity(tooltip_menu_comp_entity)
        .set_tooltip_display_data(tooltip_display_data);

    //tooltip_menu_comp.tooltip_display_data = tooltip_display_data ;
}


```



SO that is a peer into the way I construct that entire UI inventory menu in only about 150 lines of code using raw bevy UI.! Enjoy    