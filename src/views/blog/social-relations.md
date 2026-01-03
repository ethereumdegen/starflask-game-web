

 

#   Social Relations System in Bevy 

## Introduction

In RPG games, character interactions can significantly impact gameplay, influencing player decisions and character development. This blog post introduces a custom social relations system built using the Bevy game engine. Our goal is to dynamically manage relationships through a scoring system that adjusts based on player actions, such as combat or dialogue choices.
 



 

Our system consists of:
- **SocialRelationEdgesMap**: A component that stores relationships and scores between entities.
- **SocialRelationEdge**: An enum representing different types of interactions and their effects on social scores.

These components work together to update and manage how entities perceive each other within the game world, enhancing the depth and realism of social interactions. 




### Component and Event Declarations


A component named Social Relation Edges Map is used to store relation edges for each other entity, effectively like a mini 'bevy components' set that is locally scoped per other entity.  This is made possible by DiscriminantHashEq which implements Hash in a way in which only the discriminant is considered for Eq - not any of the props in the variant.  



```rust
#[derive(Component, Default, Reflect, Debug)]
#[reflect(Component)]
pub struct SocialRelationEdgesMap(pub HashMap<Entity, HashSet<SocialRelationEdge>>);

#[derive(Event)]
pub struct UpdateSocialRelationEdges {
    pub social_target: Entity,
}

#[derive(Clone, Reflect, Debug, DiscriminantHashEq)]
pub enum SocialRelationEdge {
    RecentlyDamagedBy,
    SharesVirtues(HashSet<VirtueType>),
}
```  





### System for Handling Social Updates
Systems are used this use Entity Ref to update the edges map when needed. A custom EntityCommand is defined in order to help us overcome the borrow checker when we need access to &mut World.

```rust
 


// this is triggered on an entity when it enters dialog with the player -- just in time recalculation 
fn handle_update_social_relation_edges(
	trigger: Trigger<UpdateSocialRelationEdges>,

    mut commands: Commands,

   
    entity_ref_query: Query<EntityRef>,
) {
   
	    let social_source_entity = trigger.entity();

	    let social_target_entity = trigger.event().social_target;

	     let Some(source_entity_ref) = entity_ref_query.get(social_source_entity).ok() else {
	            return;
        };
    
        let Some(target_entity_ref) = entity_ref_query.get(social_target_entity).ok() else {
            return;
        };

      
           
         let target_social_edges =
                build_social_relation_edges(source_entity_ref, target_entity_ref);
   

        commands
            .entity(social_source_entity)
            .set_social_edges_set_for_target( social_target_entity ,  target_social_edges  ) ; 
           
    
}



 
fn build_social_relation_edges(
    source_ref: EntityRef,
    target_ref: EntityRef,
) -> HashSet<SocialRelationEdge> {
    let mut target_edges = HashSet::new();

    


    // if species are allied or unallied, this could add an edge 


    // if recently damaged by this entity, this could add an edge like this 

    target_edges.insert(   SocialRelationEdge::RecentlyDamagedBy ) ;


    // if .. some component is on the entities...  add.. some edges based on that 



    return target_edges;
}


 


struct SetSocialEdgesSet {
    target:Entity, 
    edges_set: HashSet<SocialRelationEdge>
}

impl EntityCommand for SetSocialEdgesSet {
    fn apply(self, source: Entity, world: &mut World) {


        let Some(mut social_relations_map) = world.get_mut::<SocialRelationEdgesMap>(source) else {
            
 

            return;
        };

        social_relations_map.0.insert( self.target, self.edges_set ); 



    }
}






pub trait SetSocialEdgesSetExt { 
    fn set_social_edges_set_for_target(&mut self, target: Entity, updated_set:HashSet<SocialRelationEdge>) -> &mut Self;
     
}


impl SetSocialEdgesSetExt for EntityCommands<'_> {
    
    fn set_social_edges_set_for_target(&mut self, target: Entity, updated_set:HashSet<SocialRelationEdge>) -> &mut Self {
        self.queue(SetSocialEdgesSet {
            target: target,
            edges_set: updated_set,
        });

        self
    }

}


```

### Quickly compute relationship score when needed 

 

```rust



#[derive(  Clone,   Reflect, Debug, DiscriminantHashEq)]
pub enum SocialRelationEdge {


    RecentlyDamagedBy, // hurts score - comes from reading a component 


    SharesVirtues (HashSet<VirtueType>), // ?? how to improve this ? 

   // Threatening, // ?

    
}

impl SocialRelationEdge {
    pub fn get_score_contribution(&self) -> f32 {
        match self {
            

            Self::SharesVirtues(virtues_set) => 100.0,  //fix me .. make it depend on the virtues that match.. etc  


            Self::RecentlyDamagedBy => -10000.0,
             
        }
    }
}


impl SocialRelationEdgesMap{

	pub fn get_social_relation_score_for_target(&self, target: &Entity) -> f32 {

		let edge_set = self.0.get(target); 

		return match edge_set {

			Some(set) => compute_social_relation_edge_set_score ( set ) ,
			None => 0.0 

		}

	}

}

fn compute_social_relation_edge_set_score(
    social_relation_edge_set: &HashSet<SocialRelationEdge>,
) -> f32 {
    let mut social_score = 0.0;

    for edge in social_relation_edge_set {
        social_score += edge.get_score_contribution();
    }

    social_score
}
 





```

## Conclusion

This system allows developers to create rich, dynamic social interactions in RPG games using Bevy. By adjusting the social scores based on player actions and NPC reactions, the game environment becomes more immersive and reactive, providing a deeper experience for players.

### Next Steps

- Extend the system to handle more complex interactions like alliances, betrayals, and friendships.
- Optimize the system to handle large numbers of entities without performance degradation.

By integrating this social relations system into your Bevy game, you can significantly enhance character interaction dynamics, making your RPG more engaging and interactive.
 


 Here is the full code: 


https://gist.github.com/ethereumdegen/b865cc64c8438ac5617d7263b26df2c6