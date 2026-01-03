
# Abilities System in Bevy 
  

In Healing Spirit, abilities are defined in RON files as such: 




```

 (    
        title:"attack_basic", // title  not used atm ..
        render_name: "Attack",
        cast_type: Instant, 

        cast_point: 0.05,


        ability_context_flags: Some([Threatening,Offensive]),

        activation_sound_clip: Some( ClipType( SwingSword )  ),
        casting_start_anim: Some( AttackMinorA ),
        casting_start_mesh_vfx: Some( ( 
            fx_type_name: "sword_slash_horizontal_purple.magicfx" ,
            attachment_point: Some( InfrontOfFace )

             ) ),


        animation_time: 0.4,

        cooldown: 0.4, 

          target_type: AbilityEffectsInteractionShapecast( scale: Some((1.0,1.0,1.0)), offset: Some((0.0, -1.0, -1.0) )  ), 
 
        max_range: Some(2.0),

         effects_immediate: Some([

            (
                effect:  DashMoveInstantEffect((direction_type: Forward,distance:1.0) ) , 
                interaction_flags: [ WithSelf, Blockable ], 
            ),

          ]),

        effects_at_cast_point: Some([
        
          
            ( 
                effect: DealDamageInstantEffect  ( (
                damage_type: Physical  ,
                 damage_material_type: Some(Metal), 
                  damage_layer: Primary,
                 amount_calc: [DiceRoll("1d60+55")
                 ] ) ), 
                interaction_flags: [ WithTarget , Blockable ] 
            ) ,



            (
                effect:  AddHitReactionInstantEffect((hit_reaction_type: Minor)) , 
                interaction_flags: [ WithTarget , Blockable ]  
            ),
 
 
            (
               effect: AddConditionInstantEffect (( condition_type: "parrying_basic.condition" )),  //add a duration override here ? 
                interaction_flags: [ WithSelf ] 
            )

            


        ]),

          
)


```


When an ability is requested to be cast, an event is emitted which is then picked up by the abilities system which spawns an entity with an AbilityInstance component, therefore making it an AbilityInstance entity. There are a few components on this entity with context data related to the caster, the ability type, the cast time, and so forth. 

```



   let new_ability_entity = commands
            .spawn((
                Name::new(ability_type.to_string()),
                AbilityInstance {
                    ability_type: ability_type.to_string(),
                },
                AbilityInstanceTypeData(ability_type_data.clone()),
                AbilityCastSourceEntity(ability_cast_entity),
                AbilityCastState::Init,
                AbilityCastStartTime(start_time),
                AbilityCastTargets(HashSet::new()),
                AbilityAdvancesAttackSequence, // sends AttackSequenceEvent  if actually successfully cast
            ))
            .id();



```



The abilities systems are monitoring for these abilities entities and handling them (manipulating other components) based on their 'AbilityCastState' enum component.

```




#[derive(Component, Clone, Default, Debug, Reflect, PartialEq, Eq)]
#[reflect(Component)]
pub enum AbilityCastState {
    #[default]
    Init,

    CollectTargets,
    FilterTargets,
    ValidateRequirements,
 
    StartPrecast,
    Precast,
    StartCasting,
    Casting,
    Complete,
}


```




## Collect Targets

Loops through all abilities that are in the Init state, sets to CollectTargets, calls this function to generate a HashSet of Entities to then inject into the AbilityCastTargets entity on the ability entity.  It then sets the AbilityCastState to FilterTargets. 

```


pub fn get_ability_cast_targets(
    caster: &Entity,
    // caster_global_translation: Vec3,
    target_type: &AbilityTargetType,

    spatial_query: &SpatialQuery,

    global_transform_query: &Query<&GlobalTransform>,
    targetting_component_query: &Query<&TargettingComponent>,
    //world: &World,
) -> HashSet<Entity> {
    let mut targets = HashSet::new();

    match target_type {
        AbilityTargetType::SelfTarget => {
            targets.insert(*caster);
        }

        //use the casters target component ??  weird..
        AbilityTargetType::SingleTarget => {
            let targetting_comp = targetting_component_query.get(*caster).ok();
            let targetted_entity = &targetting_comp.map(|t| t.current_target).flatten();

            if let Some(targetted_entity) = targetted_entity {
                targets.insert(*targetted_entity);
            }
        }

        AbilityTargetType::SelfAndSingleTarget => {
            targets.insert(*caster);

            let targetting_comp = targetting_component_query.get(*caster).ok();
            let targetted_entity = &targetting_comp.map(|t| t.current_target).flatten();

            if let Some(targetted_entity) = targetted_entity {
                targets.insert(*targetted_entity);
            }
        }

        AbilityTargetType::AbilityEffectsInteractionShapecast { scale, offset } => {

            let Some(origin_xform) = global_transform_query.get(*caster).ok() else {
                return HashSet::new();
            };

            let origin_translation = origin_xform.translation();
    
            let direction = origin_xform.forward() ;

            let mut entities_to_ignore = HashSet::new();

            let max_range = None; // : ability_type_data.max_range

            let collision_filters = [CollisionLayer::Character, CollisionLayer::Doodad].into();

            targets = get_ability_targets_from_shapecast(
                &origin_translation,
                &direction, 
                &spatial_query,
                &entities_to_ignore, // could ignore source entity but prob dont have to since it cannot contact w itself
                max_range,
                scale.unwrap_or((1.0, 1.0, 1.0).into()),
                offset.unwrap_or((0.0, 1.0, 1.0).into()),
                collision_filters,
            );

          
        }

     //   _ => {}
    }

    targets
}


```



## Filter Targets


Loops through all ability entities with cast state of Filter Targets, gets the entity hash set of targets from the AbilityTargets components , runs it through the following filtration, and then re-injects it back into the AbilityTargets component after being filtered out of invalid targets.  Notice that I pass in &World which super-powers the InteractionFlags enum for me and makes it extremely easy to add more features later.   

Then the ability state is set to ValidateRequirements 

```


 
pub fn filter_with_ability_interaction_flags(
   
    targets: &HashSet<Entity>,
     source: Option< &Entity >, 
    interaction_flags: &AbilityInteractionFlagSet,
    world: &World,
) -> HashSet<Entity> {
    let mut filtered_targets = HashSet::new();
 
    for target in targets {   
        if target_is_within_ability_interaction_flags ( 
            target, source, & interaction_flags, &world
            ).is_ok() { 
            filtered_targets.insert( *target ) ; 
        }  
    } 

    info!("filtered targets {:?}" , filtered_targets );

    filtered_targets
}



```

```


pub enum AbilityInteractionFlag {
    WithSelf,    //with SOURCE
    NotWithSelf,  
 
    WithAllies,
    WithEnemies,
     
    WithTriggeringUnit,
 
    OnlyWithInteractable,                      
    OnlyWithLocked,                          
 

    Blockable, 
    Healable,  
    Ressurectable,

    OnlyCorpse, 
    OnlyDead, 
}



pub fn target_is_within_ability_interaction_flags(
    target: &Entity,
    source: Option<&Entity>,
    interaction_flags: &AbilityInteractionFlagSet,
    world: &World  
) -> Result< (), AbilityInteractionFlagError > {


   
    if interaction_flags.contains( &AbilityInteractionFlag::WithSelf )
    {   
        if let Some(source) = source {
            if target != source {
                return Err( AbilityInteractionFlagError::WithSelf ) 
            } 
        }else {
            return Err( AbilityInteractionFlagError::WithSelf ) 
        }

    }

     if interaction_flags.contains( &AbilityInteractionFlag::NotWithSelf )
    {   
        if let Some(source) = source {
            if target == source {
                return Err( AbilityInteractionFlagError::NotWithSelf )  
            } 
        }  
    }


     if interaction_flags.contains( &AbilityInteractionFlag::OnlyWithLocked ) 
        && world.get::<InteractionPrevented>( *target ).is_none(){
            return Err( AbilityInteractionFlagError::OnlyWithLocked )  ; 
    }  

     if interaction_flags.contains( &AbilityInteractionFlag::OnlyWithInteractable ) 
        && world.get::<InteractableComponent>( *target ).is_none(){
            return Err( AbilityInteractionFlagError::OnlyWithInteractable )  ; 
    }  




    let persistent_effects_comp =
                        world.get::<PersistentEffectsComponent>( *target );

    let dodge_comp = world.get::<Dodge>( *target );

      let dead_comp = world.get::<Dead>( *target );           





    let effect_is_blockable =  interaction_flags
         .contains(&AbilityInteractionFlag::Blockable);
 

    if  effect_is_blockable { 
            if persistent_effects_comp.is_some_and(|comp| {
                 comp.contains_persistent_effect(&PersistentEffect::Blocking)
            }) {
                    //this will do apply combat block event 
                return Err( AbilityInteractionFlagError::Blocked )  ; 

            } 
    }




       let is_ressurectable = persistent_effects_comp.is_some_and(|comp| {
                        comp.contains_persistent_effect(&PersistentEffect::Ressurectable)
                    });

       let has_prevent_healing = persistent_effects_comp.is_some_and(|comp| {
                        comp.contains_persistent_effect(&PersistentEffect::PreventHealing)
                    });


        if   interaction_flags
            .contains(&AbilityInteractionFlag::OnlyCorpse) {

                if dead_comp.is_none() {
                    return Err( AbilityInteractionFlagError::NotCorpse  )  ; 
                }
      } 

         if   interaction_flags
            .contains(&AbilityInteractionFlag::OnlyDead) {

                if dead_comp.is_none() {
                    return Err( AbilityInteractionFlagError::NotDead  )  ; 
                }
      } 


      if   interaction_flags
            .contains(&AbilityInteractionFlag::Healable) {


                let is_healable = dead_comp.is_none() || is_ressurectable;

                        if !is_healable || has_prevent_healing {
                            
                            return Err( AbilityInteractionFlagError::NotHealable )  ; 


                        }
                
      }


      if   interaction_flags
            .contains(&AbilityInteractionFlag::Ressurectable) {

                 let is_ressurectable = persistent_effects_comp.is_some_and(|comp| {
                            comp.contains_persistent_effect(&PersistentEffect::Ressurectable)
                    });

                    if !is_ressurectable || dead_comp.is_none() {
                       return Err( AbilityInteractionFlagError::NotRessurectable )  ; 
                    }

                
      }

       if effect_is_blockable { 

              if persistent_effects_comp.is_some_and(|comp| {
                        comp.contains_persistent_effect(&PersistentEffect::Parrying)
                    }) {
                     return Err( AbilityInteractionFlagError::Parried )  ; 
             }

       }


       if effect_is_blockable {

             if dodge_comp.is_some_and(|dodge| (&dodge.active_dodge).is_some()) {
                  return Err( AbilityInteractionFlagError::Dodged )  ; 
             }
       }


    Ok(()) 



}


```



## Validate Requirements 

Next, a system loops through all abilities in the ValidateRequirements state using this function.  If an error is returned, the ability 'fails' , gets a failed component and is cleaned up.   If OK is returned, the ability cast state is set to StartPrecast and we keep going.  

The great part about this helper function is that again, we have access to the caster entity, the filtered targets, and &World which makes it INCREDIBLY powerful to be able to add more features later on ; i mean we can essentially do everything and anything here related to super cool ability requirements later.  So extensible.  

```



pub fn get_ability_cast_requirements_are_satisfied(
    caster: &Entity,
    cast_requirements: &Vec<AbilityCastingRequirement>,
    targets: &HashSet<Entity>,
    world: &World,
) -> Result<(), AbilityCastErrorEvent > {  //return a Result with an error ?? 

    for requirement in cast_requirements {
        match requirement {
            AbilityCastingRequirement::RequiresValidTarget => {
                if targets.is_empty() {
                    return Err ( AbilityCastErrorEvent::RequiresValidTarget );
                }
            }
            AbilityCastingRequirement::RequiresCasterResource {
                resource_type,
                amount,
            } => {

                // get the casters resource amt using world.. yeah ..
            }
        }
    }

    Ok(())
}



```


## Ability Precast 

A system loops through every ability with the state StartPrecast and this is where we handle three props defined in the ability type: 

1. casting_start_mesh_vfx 
2. casting_start_sound_effect 
3. effects_immediate

In order to do this more cleanly, I just do trigger_targets on the ability entity and an observer will handle reading the components and ability type data for the ability entity in order to broadcast events to the sound systems and VFX systems and 'instant effects' systems (like dealing damage).  

```

  commands.trigger_targets( RenderAbilityFxEvent::CastStart  , ability_entity);

  commands.trigger_targets( PlayAbilitySoundEvent::CastStart  , ability_entity);


```


The instant effects system is broadcasted to as follows: 

```


 let effects = ability_type_data
                    .effects_immediate
                    .clone()
                    .unwrap_or(Vec::new());

               
                    //apply effects immediate 
            if ability_cast_targets.0.is_empty() {
                 for instant_effect in &effects { 
                 commands.send_event(ApplyInstantEffectEvent {
                        effect_application: instant_effect.clone(),
                        source_entity: Some(*casting_entity),
                        target_entity:None,
                        contact_position: None,
                    });
                 }

            }else { 

                for valid_target in &ability_cast_targets.0 {
                    for instant_effect in &effects { 
                        commands.send_event(ApplyInstantEffectEvent {
                            effect_application: instant_effect.clone(),
                            source_entity: Some(*casting_entity),
                            target_entity: Some(*valid_target),
                            contact_position: None,
                        });
                    }
                }

            }
 

```



I could go on for a very long time about how I handle instant effects, but here is a quick summary.  Here is how I implement DealDamageInstantEffect to make it RON-friendly -- the first struct is defined in RON in the ability type definition.  The impl accepts world so it can do essentially anything, very extensible.  


```


#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Reflect)]
pub struct DealDamageInstantEffect {
    pub damage_type: DamageType,
    pub damage_layer: DamageLayer,
    pub damage_material_type: Option<EnvironmentMaterialType>,

    #[reflect(ignore)]
    pub amount_calc: ComputedAmountArray, //make this an expression?

                                          //pub emit_impulse: bool,   //get this from flags !?
}
 
impl InstantEffectArchetype for DealDamageInstantEffect {
    fn apply_to_world(
        &self,
        source_entity: Option<Entity>,
        affected_entity: Option<Entity>,
        contact_position: Option<Vec3>,
 
        world: &mut bevy::prelude::World,
    ) {
        let Some(affected_entity) = affected_entity else {
            return;
        };

        let damage_type = &self.damage_type;
        let damage_layer = &self.damage_layer;

        let damage_material_type = &self.damage_material_type;

        let amount_calc = &self.amount_calc;

        let emit_impulse = &true; // FOR NOW - get me from interact flags !?

        let Some(mut damage_evt_writer) = world.get_resource_mut::<Events<CombatDamageEvent>>()
        else {
            return;
        };

        damage_evt_writer.send(CombatDamageEvent {
            victim: affected_entity,
            attacker: source_entity,
            damage_type: damage_type.clone(),
            damage_layer: damage_layer.clone(),
            amount_calc: amount_calc.clone(),
            damage_material_type: damage_material_type.clone(),
            contact_position: contact_position.clone(),
            emit_impulse: *emit_impulse,
        });
    }
}


```


I used to broadcast an event to apply an instant effect from one entity to a target entity, but now I use a command since this makes it much more straightforward to access &mut World versus using an Event.  This command is queued , for example, when a Unit casts an ability.  The ability data (specified in RON) is deserialized, then the array of InstantEffects is looped through and for each one, this command is queued.  That performs the ability effects , which were specified in the RON file, onto the bevy world.  


```



#[derive( Debug, Clone)]
pub struct ApplyInstantEffectCommand {
    pub effect_application: InstantEffectApplication,
    pub source_entity: Option<Entity>,
    pub target_entity: Option<Entity>, //targets ?
    pub contact_position: Option<Vec3>,
}
impl Command for ApplyInstantEffectCommand {



    fn apply(self, world: &mut  World) { 


        let effect_application = self.effect_application.clone();
        let source = self.source_entity;
        let target = self.target_entity;
        let contact_position = self.contact_position;

        effect_application.apply_to_world(source, target, contact_position, world);

    }
}

```


  I love how I have about 20 different kinds of instant effects, each with their own .rs file, and they accept &World and they are RON friendly.  So that is the gist !!! 


And that is basically it !! There are more states such as Precast, StartCasting, Casting but they work almost the same as StartPrecast.   Some of them keep track of a time delay in order to determine when the set the ability state to the next as opposed to doing it immediately like the earlier systems.  