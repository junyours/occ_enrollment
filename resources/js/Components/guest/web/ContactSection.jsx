import { Button } from '@/Components/ui/button'
import { Calendar, Mail, MapPin, Phone, Smartphone } from 'lucide-react'
import React from 'react'

function ContactSection() {
    return (
        <section className="py-12 bg-blue-600 dark:bg-blue-700 text-white transition-colors duration-200">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">
                        Get Started Today
                    </h2>
                    <p className="text-lg text-blue-100 dark:text-blue-200">
                        Ready to join our community of learners? Contact us for more information.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-8 text-center">

                    {/* Landline or Main Contact */}
                    <div>
                        <Phone className="h-6 w-6 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">Telephone</h3>
                        <p className="text-blue-100 dark:text-blue-200">
                            <a href="tel:+63885551234" className="hover:underline">
                                (088) 882-3269
                            </a>
                        </p>
                    </div>

                    {/* Mobile Contact */}
                    <div>
                        <Smartphone className="h-6 w-6 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">Mobile</h3>
                        <p className="text-blue-100 dark:text-blue-200">
                            <a href="tel:+639532609906" className="hover:underline">
                                +63 953 260 9906
                            </a>
                        </p>
                    </div>

                    {/* Email */}
                    <div>
                        <Mail className="h-6 w-6 mx-auto mb-3" />
                        <h3 className="font-semibold mb-2">Email</h3>
                        <p className="text-blue-100 dark:text-blue-200">
                            <a href="mailto:opolcommunitycollege@yahoo.com" className="hover:underline">
                                opolcommunitycollege@yahoo.com
                            </a>
                        </p>
                    </div>

                </div>


                {/* <div className="text-center">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 dark:bg-gray-100 dark:text-blue-700 dark:hover:bg-white">
                        <Calendar className="mr-2 h-5 w-5" />
                        Schedule Campus Visit
                    </Button>
                </div> */}
            </div>
        </section>
    )
}

export default ContactSection
