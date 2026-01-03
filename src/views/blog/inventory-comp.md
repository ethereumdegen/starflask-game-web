
# Inventory System in Bevy 

In this blog post, we'll explore the implementation of an inventory component for a game built with the Bevy game engine. We'll dive into the details of how inventory slots work, how events are handled, and the logic checking involved.

## Inventory Component

The `InventoryComponent` is the core of the inventory system. It contains a `HashMap` called `items` that maps slot indices to item entities.


All 'Units' in my game get one of these.  Monsters use it to hold equipped weapons, chests use it to hold items which can be looted, dead monsters corpses use it so they can be looted, etc. 

```rust
#[derive(Component, Default, Serialize, Deserialize, Clone, Debug)]
pub struct InventoryComponent {
   pub items_map: HashMap<usize, Entity>,
  
}




```


The `InventoryComponent` provides methods for adding items to the inventory, setting items at specific slots, and retrieving equipped items. It also includes logic for finding the best slot index for an item based on its type and checking if a slot is valid for a given item.


## Inventory Slots
Inventory slots are represented by indices in the items HashMap. Slots 0 to 99 are reserved for equipment slots, while the inventory 'backpack' container starts at slot 100 onwards forever.


Instead of storing data in an ItemSlotData struct like before: 

```rust


// I used to do it this way!!  DO NOT DO THIS

#[derive(  Debug, Clone, Serialize, Deserialize)]
pub struct ItemSlotData {
      item_type_name: String, //this should be short name like 'dagger' 
      item_type : ItemType, 
    
      quantity: Option<u32>,  //only matters if stackable
      durability: Option<u32>,
      charges: Option<u32>,
      enchantments: Option<Vec<String>>, //file stem of a condition type
      rune: Option<String>,
}


```


I now use the Item Entity and its many components to store all of this same data.  That way, I have more of an ECS friendly approach. Now, an item entity in my game has components such as ItemDurability, ItemQuantity, ItemType, and so forth.  The inventory system uses the Hashmap ( usize -> Entity) as a kind of pointer to look up information about any item via its components, typically using EntityRef or World. 

This is how I define an item type serialized in RON:


```rust
#[derive(Debug, Asset, Clone, Serialize, Deserialize)]
pub(crate) struct ItemType {
   
    pub render_name: String,

    pub description: Option<String>,

    //use  a hashmap instead?
    pub item_classifications: Option<HashSet<ItemClassification>>,

    pub item_subtypes: Option<HashSet<ItemSubtype>>,
    pub item_rarity: Option<ItemRarity>,

    #[serde(default)]
    pub item_spawns_unidentified: bool,

    //  pub item_classifications: HashSet< ItemClassification >,
    pub preview_model: Option<String>,
    pub icon_texture: Option<String>,
    pub icon_material: Option<EnvironmentMaterialType>,

    pub inventory_container_dimensions: Option<[u32; 2]>,

    pub model_swappable_materials: Option<SwappableMaterialsMap>, //move this into eq data ?

    pub item_model_type: ItemModelType,

    pub max_durability: Option<u32>,


}

 
// allows me to add any number of 'classifications' to an item so it can be both an Equipment and be Socketed and be QuestItem for example.  
// Each of these represents a component that gets added to the item entity on spawn. 
 #[derive(Debug, Asset, Clone, Serialize, Deserialize, DiscriminantHashEq, Reflect)]
pub enum ItemClassification {
    Consumable(ConsumableItemData),
    KeyUnique(KeyUniqueItemData),
    Equipment(EquipmentItemData),
    Socketed(SocketedItemData),
    Gemstone(GemstoneItemData), //slots in to equipment
    Formula(FormulaItemData),   // teaches you how to craft this formula (store in   comp on player)
    QuestItem,
    Extractable(ItemDisintegrationData), //can disintegrate
    Reagent,
    Misc,
}


```

## Inventory Events

The inventory system uses events to handle actions such as adding items to the inventory, adding enchantments to items, and swapping item slots.

The InventoryEvent enum defines the different event types:

```rust
#[derive(Event)]
pub enum InventoryEvent {
    AddItemToInventory {
        inventory_entity: Entity,
        item_entity: Entity,
         
        source_type: ItemAddSourceType,
        equip_to_slot_context: Option<EquipToSlotContext>, //describes HOW to auto equip
    },

     RemoveItemFromInventory {
        inventory_entity: Entity,
        item_entity: Entity,
    },

    
   PerformMoveItemToSlot {
        inventory_entity: Entity,

        source_slot_index: usize,
        target_slot_index: usize,
    },
}
```


```rust

//helps describe the way to auto-equip a new item, if any 
#[derive(Clone, Debug)]
pub enum EquipToSlotContext {
    SpecificSlot(usize),
 
    EquipmentType(EquipmentType),

    AutoEquip, //into appropriate slot for item
}

```



## Handling Inventory Events

I recently refactored my code for adding an item to an inventory by turning it into an EntityCommand instead of an Event which made the code much simpler since it runs more in 'single-thread' versus 'parallel execution' essentially.  This command retrieves the InventoryComponent for the specified entity, finds the best slot index for the item based on its type, and attempts to add the item to the inventory.  The entire time, the item remains an entity but will lose its 'spatial bundle' meaning its transform and visibility components once it 'goes into the inventory'.  It keeps its other components like durability and enchantments.! 

```rust 




struct AddItemToInventoryCommand{


      inventory_entity: Entity, 
      source_type: ItemAddSourceType,
      equip_to_slot_context : Option<EquipToSlotContext>


} 





impl EntityCommand for AddItemToInventoryCommand {
    fn apply(self, item_entity: Entity, world: &mut World) {



        let inventory_entity = self.inventory_entity;
        let source_type = self.source_type;
        let equip_to_slot_context = self.equip_to_slot_context; 

          let mut populated_item_slots = HashMap::new();

                info!("adding item to inventory 1 {:?}", inventory_entity);

                let Some(inventory_entity_persistent_uuid) = world.get::<PersistentUUID>( inventory_entity) 
                else {
                    warn!("Inventory entity has no persistent uuid ");
                    panic!("Inventory entity has no persistent uuid ");
                    return;
                };

                let inventory_entity_persistent_uuid = inventory_entity_persistent_uuid.clone() ;



                let mut all_inventory_children = Vec::new();

                // let mut all_inventory_slot_components = Vec::new();
                let mut item_slots_map: HashMap<usize, Entity> = HashMap::new();

                if let Some(inventory_children) = world.get::<Children>( inventory_entity)  {
                    for inventory_child in inventory_children {
                        all_inventory_children.push(inventory_child.clone());
                    }
                }

                // --- find populated item slots ---
                for inventory_child in all_inventory_children {
                    if let Some(item_entity_ref) = world.get_entity(inventory_child).ok()  {
                        let Some(_inv_item_comp) = item_entity_ref.get::<ItemComponent>() else {

                               //panic!("could not equip item - no ItemComponent ");
                            continue;
                        };

                        let Some(item_in_inventory_slot_comp) =
                            item_entity_ref.get::<ItemInInventorySlot>()
                        else {
                            panic!("could not equip item - ItemInInventorySlot ");

                            continue;
                        };

                        let item_container_dimensions_comp =
                            item_entity_ref.get::<ItemContainerDimensionData>();

                        let item_dimensions = item_container_dimensions_comp
                            .map(|c| c.inventory_container_dimensions)
                            .unwrap_or([1, 1]);

                        let inv_slot_index = item_in_inventory_slot_comp.0;

                        populated_item_slots
                            .insert(inv_slot_index, PopulatedInventorySlot { item_dimensions });

                        //all_inventory_slot_components.push( item_in_inventory_slot_comp.clone( ) ) ;
                        item_slots_map.insert(inv_slot_index, item_entity.clone());
                    }
                }

                if let Some(item_entity_ref) =  world.get_entity(item_entity).ok() {
                    // let item_type_name = &item_comp.item_type_name;

                    //  let equip_to_slot_context = &equip_to_slot_context ;

                    let equip_slot_index = equip_to_slot_context
                        .as_ref()
                        .map(|sc| {
                            InventoryComponent::find_best_equip_slot_index_for_item_of_type(
                                &item_slots_map,
                                &item_entity_ref,
                                &populated_item_slots,
                            //   &HashSet::new() ,//,  &item_slots_modified_this_cycle.get(inventory_entity).unwrap_or(&HashSet::new()),
                                &sc,
                            )
                        })
                        .flatten();

                    // make sure same slot index isnt added to twice in one cycle !
                    //this is a bug rn because commands has a one-frame delay !

                    let add_item_succeeded = InventoryComponent::get_can_add_item(
                        &item_slots_map,
                      //  &HashSet::new(), //, &item_slots_modified_this_cycle.get(inventory_entity).unwrap_or(&HashSet::new()),
                        &item_entity_ref,
                        // item_data_combined.clone(),
                        equip_slot_index,
                        &populated_item_slots,
                    );

                    if let Ok(item_slot_index) = add_item_succeeded {
 

                        world.commands().entity(item_entity).queue(RemoveSpatialBundle);  

                        //    let item_entity_persistent_uuid = persistent_uuid_comp;

                        info!(
                            "item added to inv persistent {:?} {:?}",
                            inventory_entity_persistent_uuid, inventory_entity
                        );

                        //this has to happen before hook !  from ItemInInventoryPersistent !  
                        world.commands().entity(item_entity)
                                .set_parent(inventory_entity);

                        world.commands()
                            .entity(item_entity)
                            .remove::<EnchantmentMaterialLink>();

                            //turn this into a command ?
                        world.commands().entity(item_entity).insert((
                            //ItemInInventory(inventory_entity.clone()),
                            ItemInInventorySlot(item_slot_index),
                            ItemInInventoryPersistent(inventory_entity_persistent_uuid.clone()),
                            NoInteractionSensor, //remove the sensor
                            NoItemModel,         //this does nothing yet ?
                        ));

                        //  inventory_sound_event_writer.send( InventorySoundEvent::PlaySoundForItemInSlot { slot_index: item_slot_index } );
                    }

                    if let Err(e) = add_item_succeeded {
                        warn!("{:?} ", e);
                        warn!("need to spawn item at feet ...  ?");

                         panic!("need to spawn item at feet ...  ?");
                        //spawn the item at chars feet but somehow make it NOT do interact ...
                    }
                    // }
                }



    }
}
 
// finish me ! 
struct RemoveItemFromInventoryCommand  ;


impl EntityCommand for RemoveItemFromInventoryCommand {
    fn apply(self, item_entity: Entity, world: &mut World) { 

      //  let inventory_entity = self.inventory_entity ;

           let mut commands = world.commands(); 

           commands
                .entity(item_entity)
                .remove::<ItemInInventorySlot>();

            commands.entity(item_entity).remove::<ItemIsEquipped>();
            commands
                .entity(item_entity)
                .remove::<NoInteractionSensor>();
            commands.entity(item_entity).remove::<NoItemModel>();
            commands
                .entity(item_entity)
                .remove::<EnchantmentMaterialLink>();
            commands
                .entity(item_entity)
                .remove::<ItemInInventoryPersistent>();

 }
}




```



I am able to cascade changes in items to the inventory automatically like this 

```rust


fn cascade_item_changes_to_inventory(
    item_query: Query<
        (Entity, &ItemComponent, &ItemInInventoryPersistent),
        Or<(
            Changed<ItemComponent>,
            Changed<ItemInInventorySlot>,
            Changed<ItemPersistentEffectsComponent>,
        )>,
    >,
 
    mut commands:Commands, 

    persistent_uuid_entity_lookup: Res<PersistentUuidLookupResource>,
) {
    for (_item_entity, _item_comp, item_in_inv) in item_query.iter() {
        let inventory_entity_persistent_uuid = item_in_inv.get_uuid();

        let Some(inventory_entity) = persistent_uuid_entity_lookup
            .persistent_uuids_map
            .get(&inventory_entity_persistent_uuid)
        else {
            continue;
        };


        if let Some(mut cmd) = commands.get_entity(*inventory_entity) {
            cmd.queue(InventoryForceRefresh) ;
        }

    
    }
}



pub struct InventoryForceRefresh ;

impl EntityCommand for InventoryForceRefresh { 

    fn apply(self, entity:Entity, world: &mut World) { 

        if let Some(mut inventory_comp) = world.get_mut::<InventoryComponent>(entity) {
 
            inventory_comp.set_changed();
            
        }else {
            warn!("called inventory force refresh on a non-inventory");
        }

     }
}


```




Since bevy 0.14, I upgraded this system to account for invariants by inventing the components ItemInInventorySlot and making it run a hook on insert that mutates the inventory components hashmap like so.  I do a similar hook for PersistentUUIDs per entity. 

```



#[derive(Serialize, Deserialize, Clone, Debug, Reflect)]
#[reflect(Component)]
pub struct ItemInInventorySlot(pub usize);

impl Component for ItemInInventorySlot {
    const STORAGE_TYPE: StorageType = StorageType::Table;

    fn register_component_hooks(hooks: &mut ComponentHooks) {
        //on replace ?

        // Whenever this component is removed, or an entity with
        // this component is despawned...
        hooks.on_remove(|mut world, item_entity, _component_id| {
            let Some(item_entity_ref) = world.get_entity(item_entity).ok() else {
                return;
            };

            let Some(item_inv_slot_comp) = item_entity_ref.get::<ItemInInventorySlot>() else {
                return;
            };

            let slot_index = item_inv_slot_comp.0;

            let Some(item_parent) = item_entity_ref.get::<Parent>() else {
                return;
            };

            let parent_entity = item_parent.get();

            let Some(mut parent_entity_ref) = world.get_entity_mut(parent_entity).ok() else {
                return;
            };

            let Some(mut inventory_comp) = parent_entity_ref.get_mut::<InventoryComponent>() else {
                warn!("item parent is not inv");
                return;
            };

            inventory_comp.remove_from_items_map(&slot_index, item_entity);
        });

        hooks.on_insert(|mut world, item_entity, _component_id| {
            //   let Some(new_item_inv_slot_comp) = world.get_by_id(item_entity, component_id);

            info!("item slot on insert 1");
            let Some(item_entity_ref) = world.get_entity(item_entity).ok() else {
                warn!("no item entity ref ");
                return;
            };

            //is this ok  ?
            let Some(item_inv_slot_comp) = item_entity_ref.get::<ItemInInventorySlot>() else {
                warn!("no ItemInInventorySlot ");
                return;
            };

            let slot_index = item_inv_slot_comp.0;

            let Some(item_parent) = item_entity_ref.get::<Parent>() else {
                warn!("no item_parent ");
                return;
            };

            let parent_entity = item_parent.get();

            let Some(mut parent_entity_ref) = world.get_entity_mut(parent_entity).ok() else {
                warn!("no parent_entity_ref ");
                return;
            };

            let Some(mut inventory_comp) = parent_entity_ref.get_mut::<InventoryComponent>() else {
                warn!("no parent inventory_comp ");
                return;
            };

            inventory_comp.add_to_items_map(slot_index, item_entity);
        });
    }
}


```


## Logic Checking

The inventory component includes logic checking to ensure the validity of inventory operations. For example, the slot_is_valid_for_item method checks if a given slot index is valid for a specific item type.


It takes into account factors such as whether the slot is in the equipment group, if the item type matches the equipment slot type, and if the slot is already occupied by another item.

The new and improved versions of these functions actually accept &EntityRef which is my secret sauce.  This allows them to access any and all components on the Item being validated. Very nice.  The downside is you have to be smart about the borrow checker in the parent function using it. As shown above. 

```rust


 pub fn slot_is_valid_for_item(
       
        item_slot_index: usize,

        item_entity_ref: &EntityRef,

        populated_item_slots: &HashMap<usize, PopulatedInventorySlot>,
    ) -> Result<(), InventoryError> {
        let item_slot_is_in_equipment_group =
            item_slot_index < InventoryContainer::get_inventory_container_slot_offset();

        let inventory_type_at_slot = InventorySlotType::from_inventory_slot_index(item_slot_index);

        let item_can_be_equipped: bool =
            InventoryComponent::get_item_can_be_equipped(item_entity_ref);

        let equipment_data = item_entity_ref.get::<EquipmentItemData>();

        let item_equipment_type = equipment_data.as_ref().map(|eq| eq.equipment_type);

        if item_slot_is_in_equipment_group {
            if !item_can_be_equipped {
                return Err(InventoryError::ItemCannotBeEquipped);
            }

            match item_equipment_type {
                Some(eq_type) => {
                    let matching_inventory_slot_types =
                        eq_type.get_matching_inventory_slot_types(max_weapon_index);

                    if !inventory_type_at_slot
                        .is_some_and(|slot| matching_inventory_slot_types.contains(&slot))
                    {
                        return Err(InventoryError::EquipmentSlotMismatch);
                    }
                }
                None => {
                    return Err(InventoryError::EquipmentSlotMismatch);
                }
            }

            
        } else {
            //find the mask of slots that are taken up by existing items...
 
            let occupied_slot_mask: HashSet<usize> = populated_item_slots.iter().fold(
                HashSet::new(),
                |mut mask, (slot_index, populated_slot)| {
                     

                    let item_dimensions = populated_slot.item_dimensions;
                    let all_item_slots = InventoryContainer::get_all_container_slots_for_item(
                        *slot_index,
                        item_dimensions,
                    );
                    mask.extend(all_item_slots);
                    mask
                },
            );

            info!("occupied_slot_mask is {:?}", occupied_slot_mask);

            let inventory_container_dimensions =
                InventoryContainer::get_inventory_container_dimensions(); // 10 by 6

            let item_container_dimension_data = item_entity_ref.get::<ItemContainerDimensionData>();

            let item_container_dimensions = item_container_dimension_data
                .map(|dim_data| dim_data.inventory_container_dimensions);

            let all_container_slots = InventoryContainer::get_all_container_slots_for_item(
                item_slot_index,
                item_container_dimensions.unwrap_or([1, 1]),
            );

            for container_slot_index in all_container_slots {
                //make sure they are in bounds
                //let container_width = inventory_container_dimensions[0] as usize;
                let container_slot_coords =
                    InventoryContainer::slot_index_to_slot_coords(container_slot_index);

                if container_slot_coords[0] >= inventory_container_dimensions[0] as usize {
                    return Err(InventoryError::InventoryContainerBoundsExceeded);
                }

                if container_slot_coords[1] >= inventory_container_dimensions[1] as usize {
                    return Err(InventoryError::InventoryContainerBoundsExceeded);
                }

                if occupied_slot_mask.contains(&container_slot_index) {
                    return Err(InventoryError::InventorySlotOccupied);
                }
            }
        }

        return Ok(());
    }
}



    fn get_next_available_container_slot_index(
        
        item_entity_ref: &EntityRef,
        item_slots_denylist: &HashSet<usize>,
        populated_item_slots: &HashMap<usize, PopulatedInventorySlot>,
    ) -> Option<usize> {
        for slot_index in 100..160 {
            if InventoryComponent::slot_is_valid_for_item(
                slot_index,
                item_entity_ref,
                populated_item_slots,
            )
            .is_ok()
                && !item_slots_denylist.contains(&slot_index)
            {
                return Some(slot_index);
            }
        }

        None
    }



```



Heres some extra bonus code that gives you an idea about how I use enums to more cleanly define relationships and organization.  Some of this gets used by the equipment attachments rendering system. 

```



#[derive(Hash, PartialEq, Eq, Clone, Copy, Debug, Serialize, Deserialize, Reflect)]
pub enum InventorySlotType {
    Weapon(usize),

    Head,
    Shoulders,
    Chest,
    Back,
    Waist,
    Hands,
    Legs,
    Feet,

    Ring(usize),
    
}

impl InventorySlotType {
    pub fn get_all_slot_types() -> Vec<InventorySlotType> {
        return vec![
            InventorySlotType::Weapon(0),
            InventorySlotType::Weapon(1),
            InventorySlotType::Weapon(2),
            InventorySlotType::Weapon(3),
            InventorySlotType::Weapon(4),
            InventorySlotType::Weapon(5),
            InventorySlotType::Head,
            InventorySlotType::Shoulders,
            InventorySlotType::Hands,
            InventorySlotType::Chest,
            InventorySlotType::Back,
            InventorySlotType::Ring(0),
            InventorySlotType::Ring(1),
           
            InventorySlotType::Waist,
            InventorySlotType::Legs,
            InventorySlotType::Feet,
        ];
    }

    

    pub fn from_inventory_slot_index(slot_index: usize) -> Option<InventorySlotType> {
        for slot_type in InventorySlotType::get_all_slot_types() {
            if slot_type.get_inventory_slot_index() == slot_index {
                return Some(slot_type);
            }
        }

        None
    }

    pub fn get_inventory_slot_index(&self) -> usize {
        match self {
           
            InventorySlotType::Head => 10,
            InventorySlotType::Shoulders => 11,
            InventorySlotType::Chest => 12,
            InventorySlotType::Back => 13,
            InventorySlotType::Hands => 14,
            InventorySlotType::Legs => 15,
            InventorySlotType::Feet => 16,
            InventorySlotType::Waist => 17,

            InventorySlotType::Weapon(wep_index) => 20 + wep_index,
            InventorySlotType::Ring(ring_index) => 30 + ring_index,
            //  InventorySlotType::Container(container_index) => 100 + container_index
        }
    }

    // if we attach a head item, we have to 'mute' the hair accessory
    pub fn get_muted_accessory_slot(&self) -> Option<AccessorySlotType> {
        match self {
            InventorySlotType::Head => Some(AccessorySlotType::Hair),

            _ => None,
        }
    }

     

    // This is only relevant for static attachment points like weapons and (MAYBE) head
    // other attachment points require rigging so this doesn't even affect them anyways
    pub fn get_default_associated_attachment_point(&self) -> AttachmentPointType {
        //assume selected wep index is 0 !?
        match self {
            InventorySlotType::Weapon(_wep_index) => AttachmentPointType::WeaponHandMain,
            //  InventorySlotType::WeaponOff => AttachmentPointType::WeaponHandOff,
            InventorySlotType::Head => AttachmentPointType::Head,

            InventorySlotType::Back => AttachmentPointType::Back,
            InventorySlotType::Waist => AttachmentPointType::Back,

            //these all need to use dynamic bones anyways..
            InventorySlotType::Chest => AttachmentPointType::Chest,
            InventorySlotType::Shoulders => AttachmentPointType::Origin,
            InventorySlotType::Hands => AttachmentPointType::Origin,
            InventorySlotType::Legs => AttachmentPointType::Origin,
            InventorySlotType::Feet => AttachmentPointType::Origin,
            InventorySlotType::Ring(_ring_index) => AttachmentPointType::Origin, //make this hands later !!
        }
    }

    pub fn get_attachment_point_type(
        &self,
        primary_weapon_index: usize,
        primary_weapon_sheathed: bool,
    ) -> AttachmentPointType {
        match self {
            InventorySlotType::Weapon(wep_index) => {
                //  let weapon_attachment_point_index  = get_weapon_attachment_point_index();

                let attachment_index = InventorySlotType::get_weapon_attachment_point_index(
                    *wep_index,
                    primary_weapon_index,
                );

                match attachment_index {
                    1 => {
                        if primary_weapon_sheathed {
                            AttachmentPointType::WeaponSheatheMain
                        } else {
                            AttachmentPointType::WeaponHandMain
                        }
                    }
                    2 => AttachmentPointType::WeaponSheatheOff,
                    3 => AttachmentPointType::WeaponSheatheOffLeft,
                    4 => AttachmentPointType::WeaponSheatheOffRight,
                    _ => AttachmentPointType::WeaponSheatheOff, // Default case if no other matches
                }

                 
            }
            
            InventorySlotType::Head => AttachmentPointType::Head,
            InventorySlotType::Shoulders => AttachmentPointType::Shoulders,
            InventorySlotType::Chest => AttachmentPointType::Chest,
            InventorySlotType::Waist => AttachmentPointType::Back,
            InventorySlotType::Back => AttachmentPointType::Back,
            InventorySlotType::Hands => AttachmentPointType::Hands,
            InventorySlotType::Legs => AttachmentPointType::Legs,
            InventorySlotType::Feet => AttachmentPointType::Feet,
            InventorySlotType::Ring(_) => AttachmentPointType::Hands,
        }
    }

    
}


```



The inventory component in Bevy provides a flexible and extensible system for managing player inventory and equipment. By utilizing events, slots, and logic checking, it ensures a smooth and reliable inventory management experience.
 

I hope this deep dive into this Bevy game inventory component has given you a better understanding of how it works under the hood. Feel free to explore the code further and adapt it to your specific game requirements.