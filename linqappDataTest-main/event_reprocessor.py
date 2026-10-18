from kafka import KafkaConsumer, KafkaProducer, KafkaAdminClient
from kafka.structs import OffsetAndMetadata, TopicPartition
import logging

# Kafka configurations
bootstrap_servers = 'localhost:9092'
input_topic = 'events_topic'
output_topic = 'recalculated_events'
consumer_group = 'worker_service'

# Logger setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_offset(consumer, topic, group_id):
    partitions = consumer.partitions_for_topic(topic)
    topic_partitions = [TopicPartition(topic, p) for p in partitions]
    
    # Resetting offset to the earliest position to reprocess from the beginning
    offsets = {tp: OffsetAndMetadata(consumer.beginning_offsets([tp])[tp], None) for tp in topic_partitions}
    admin_client = KafkaAdminClient(bootstrap_servers=bootstrap_servers)
    admin_client.alter_consumer_group_offsets(group_id, offsets)
    logger.info("Offsets reset to the earliest position to reprocess missed events.")
    admin_client.close()

def process_event(event):
    try:
        if event['order_value'] < 0:
            logger.warning(f"Negative value detected in event {event['order_id']}. Converting to positive.")
            event['order_value'] = abs(event['order_value'])  # Convert negative value to positive
        
        if event['order_value'] >= 10000:
            logger.warning(f"Value exceeds 10,000 in event {event['order_id']}. Setting to 9999.")
            event['order_value'] = 9999  # Set the value to 9999
        
        return event['order_value']  # Return the (possibly missed) order value
    except Exception as e:
        logger.error(f"Error processing event {event['order_id']}: {e}")
        return None  # Returning None indicates the event couldn't be processed

def consume_and_reprocess_events():
    consumer = KafkaConsumer(input_topic, bootstrap_servers=bootstrap_servers, group_id=consumer_group)
    producer = KafkaProducer(bootstrap_servers=bootstrap_servers)
    
    # Reset offsets to reprocess events
    reset_offset(consumer, input_topic, consumer_group)
    
    # Consume and process events
    for message in consumer:
        event = message.value
        logger.info(f"Processing event: {event}")
        
        # Check if the event was processed correctly
        result = process_event(event)
        
        if result is not None:
            # Send recalculated event to output topic
            producer.send(output_topic, value={'original_event': event, 'recalculated_value': result})
            logger.info(f"Recalculated event: {event} -> {result}")
            # This commits the offset so we don't reprocess it
            consumer.commit()  

        else:
            logger.warning(f"Skipping recalculation for event: {event}")
            # Commit the offset to keep track of which events were processed
            consumer.commit()

    consumer.close()
    producer.close()

if __name__ == "__main__":
    consume_and_reprocess_events()
